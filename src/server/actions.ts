"use server";

import { db } from "./db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setAuthCookie, clearAuthCookie, getOrCreateDbUser } from "@/lib/auth";
import { checkPermission, normalizeRole, ROLES } from "@/lib/rbac";
import { sendTeamInvite } from "@/lib/email";
import { env } from "@/lib/env";
import {
  classifyRiskTier,
  generateDocumentSection,
  mockClassifyRiskTier,
} from "@/lib/claude";
import type { RiskClassificationResult } from "@/lib/claude";
import {
  parseGithubRepo,
  scanRepository,
  type ScanFinding,
} from "@/lib/github-scanner";
import { EU_AI_ACT_SECTORS } from "@/types";
import { generateApiKey } from "@/lib/api-auth";
import {
  sendClassificationResult,
  sendIncidentAlert,
} from "@/lib/email";
import { generateDeadlinesForSystem } from "@/lib/deadlines";
import {
  buildInitialRequirementState,
  calculateCompletionPercentage,
  collectEvidenceUrls,
  mergeRequirementState,
  type StoredConformityRequirement,
} from "@/lib/conformity-requirements";
import { persistComplianceScore } from "@/lib/compliance-scoring";
import {
  FREE_PLAN_MONTHLY_DOCUMENT_LIMIT,
  isPaidPlan,
  normalizeOrgPlan,
} from "@/lib/stripe";

// ─── Auth ────────────────────────────────────────────────────────────────

export async function loginAction(formData: FormData) {
  const email = (formData.get("email") ?? "") as string;
  const name = (formData.get("name") ?? "") as string;

  if (!email) throw new Error("Email is required");

  await setAuthCookie({
    email,
    name: name || email.split("@")[0] || "User",
    role: "admin",
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  await clearAuthCookie();
  const signOutUrl = `/api/auth/signout?callbackUrl=${encodeURIComponent("/login")}`;
  redirect(signOutUrl as never);
}

// ─── Audit Helper ────────────────────────────────────────────────────────

async function logAudit(
  userId: string,
  orgId: string,
  action: string,
  resource: string,
  resourceId?: string,
  aiSystemId?: string,
  details?: string
) {
  await db.auditLog.create({
    data: {
      userId,
      organizationId: orgId,
      action,
      resource,
      resourceId,
      aiSystemId,
      details,
    },
  });
}

function appBaseUrl(): string {
  const raw = env.NEXTAUTH_URL || env.NEXT_PUBLIC_APP_URL;
  return raw.replace(/\/$/, "");
}

// ─── Team & invitations ──────────────────────────────────────────────────

export async function inviteTeamMemberAction(email: string, role: string) {
  const user = await getOrCreateDbUser();
  if (!user) throw new Error("Not authenticated");
  if (!checkPermission(user.role, "team:invite")) {
    throw new Error("You do not have permission to invite members");
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new Error("Valid email is required");
  }

  const r = normalizeRole(role);
  if (!ROLES.includes(r)) throw new Error("Invalid role");

  const existingMember = await db.user.findFirst({
    where: {
      organizationId: user.organizationId,
      email: { equals: normalizedEmail, mode: "insensitive" },
    },
  });
  if (existingMember) throw new Error("That user is already in this organization");

  const pending = await db.invitation.findFirst({
    where: {
      organizationId: user.organizationId,
      email: { equals: normalizedEmail, mode: "insensitive" },
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (pending) throw new Error("An invitation is already pending for this email");

  const org = await db.organization.findUnique({
    where: { id: user.organizationId },
    select: { name: true, agentmailInboxId: true },
  });
  if (!org) throw new Error("Organization not found");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invitation = await db.invitation.create({
    data: {
      email: normalizedEmail,
      role: r,
      organizationId: user.organizationId,
      invitedById: user.id,
      expiresAt,
    },
  });

  const inviteUrl = `${appBaseUrl()}/invite?token=${encodeURIComponent(invitation.token)}`;
  const inviterName = user.name ?? user.email;

  void sendTeamInvite(
    normalizedEmail,
    inviterName,
    org.name,
    inviteUrl,
    org.agentmailInboxId
  ).catch((err) => console.warn("[email] team invite:", err));

  await logAudit(
    user.id,
    user.organizationId,
    "create",
    "invitation",
    invitation.id,
    undefined,
    `Invited ${normalizedEmail} as ${r}`
  );

  revalidatePath("/settings/team");
  return { ok: true as const };
}

export async function acceptInvitationAction(token: string) {
  const user = await getOrCreateDbUser();
  if (!user) throw new Error("Sign in with the invited email to accept");

  const trimmed = token.trim();
  if (!trimmed) throw new Error("Invalid invitation");

  const invitation = await db.invitation.findFirst({
    where: {
      token: trimmed,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (!invitation) throw new Error("Invitation not found or expired");

  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new Error("Sign in as the invited email address to accept");
  }

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: {
        organizationId: invitation.organizationId,
        role: invitation.role,
      },
    }),
    db.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    }),
  ]);

  await logAudit(
    user.id,
    invitation.organizationId,
    "update",
    "invitation",
    invitation.id,
    undefined,
    `Accepted invitation as ${invitation.role}`
  );

  revalidatePath("/settings/team");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function updateTeamMemberRoleAction(userId: string, role: string) {
  const actor = await getOrCreateDbUser();
  if (!actor) throw new Error("Not authenticated");
  if (!checkPermission(actor.role, "team:role")) {
    throw new Error("You do not have permission to change roles");
  }

  const r = normalizeRole(role);
  if (!ROLES.includes(r)) throw new Error("Invalid role");

  const target = await db.user.findFirst({
    where: { id: userId, organizationId: actor.organizationId },
  });
  if (!target) throw new Error("User not found");

  await db.user.update({
    where: { id: userId },
    data: { role: r },
  });

  await logAudit(
    actor.id,
    actor.organizationId,
    "update",
    "team_member",
    userId,
    undefined,
    `Updated role to ${r} for ${target.email}`
  );

  revalidatePath("/settings/team");
}

export async function removeTeamMemberAction(userId: string) {
  const actor = await getOrCreateDbUser();
  if (!actor) throw new Error("Not authenticated");
  if (!checkPermission(actor.role, "team:remove")) {
    throw new Error("You do not have permission to remove members");
  }
  if (actor.id === userId) throw new Error("You cannot remove yourself");

  const target = await db.user.findFirst({
    where: { id: userId, organizationId: actor.organizationId },
  });
  if (!target) throw new Error("User not found");

  await db.$transaction(async (tx) => {
    await tx.document.updateMany({
      where: { authorId: userId },
      data: { authorId: actor.id },
    });
    await tx.assessment.updateMany({
      where: { assessorId: userId },
      data: { assessorId: actor.id },
    });
    await tx.incident.updateMany({
      where: { reporterId: userId },
      data: { reporterId: actor.id },
    });
    await tx.scanResult.updateMany({
      where: { scannedById: userId },
      data: { scannedById: actor.id },
    });
    await tx.conformityAssessment.updateMany({
      where: { assessorId: userId },
      data: { assessorId: actor.id },
    });
    await tx.complianceDeadline.updateMany({
      where: { assigneeId: userId },
      data: { assigneeId: null },
    });
    await tx.invitation.updateMany({
      where: { invitedById: userId },
      data: { invitedById: actor.id },
    });
    await tx.auditLog.updateMany({
      where: { userId },
      data: { userId: null },
    });
    await tx.user.delete({ where: { id: userId } });
  });

  await logAudit(
    actor.id,
    actor.organizationId,
    "delete",
    "team_member",
    userId,
    undefined,
    `Removed team member ${target.email}`
  );

  revalidatePath("/settings/team");
}

export async function resendInvitationAction(invitationId: string) {
  const actor = await getOrCreateDbUser();
  if (!actor) throw new Error("Not authenticated");
  if (!checkPermission(actor.role, "team:invite")) {
    throw new Error("You do not have permission to resend invitations");
  }

  const invitation = await db.invitation.findFirst({
    where: {
      id: invitationId,
      organizationId: actor.organizationId,
      acceptedAt: null,
    },
  });
  if (!invitation) throw new Error("Invitation not found");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db.invitation.update({
    where: { id: invitationId },
    data: { expiresAt },
  });

  const org = await db.organization.findUnique({
    where: { id: actor.organizationId },
    select: { name: true, agentmailInboxId: true },
  });
  if (!org) throw new Error("Organization not found");

  const inviteUrl = `${appBaseUrl()}/invite?token=${encodeURIComponent(invitation.token)}`;
  const inviterName = actor.name ?? actor.email;

  void sendTeamInvite(
    invitation.email,
    inviterName,
    org.name,
    inviteUrl,
    org.agentmailInboxId
  ).catch((err) => console.warn("[email] team invite resend:", err));

  revalidatePath("/settings/team");
}

export async function revokeInvitationAction(invitationId: string) {
  const actor = await getOrCreateDbUser();
  if (!actor) throw new Error("Not authenticated");
  if (!checkPermission(actor.role, "team:invite")) {
    throw new Error("You do not have permission to revoke invitations");
  }

  const invitation = await db.invitation.findFirst({
    where: {
      id: invitationId,
      organizationId: actor.organizationId,
      acceptedAt: null,
    },
  });
  if (!invitation) throw new Error("Invitation not found");

  await db.invitation.delete({ where: { id: invitationId } });

  revalidatePath("/settings/team");
}

function startOfUtcMonth(): Date {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function checkPlanLimit(
  orgId: string,
  feature: string
): Promise<{
  allowed: boolean;
  message: string;
  current: number;
  limit: number;
}> {
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { plan: true, maxSystems: true },
  });
  if (!org) {
    return {
      allowed: false,
      message: "Organization not found.",
      current: 0,
      limit: 0,
    };
  }

  const plan = normalizeOrgPlan(org.plan);

  if (feature === "systems") {
    const current = await db.aiSystem.count({
      where: { organizationId: orgId },
    });
    const limit = org.maxSystems;
    const allowed = current < limit;
    return {
      allowed,
      message: allowed
        ? ""
        : `System limit reached (${current}/${limit}). Please upgrade your plan.`,
      current,
      limit,
    };
  }

  if (feature === "document_generation") {
    if (isPaidPlan(plan)) {
      return {
        allowed: true,
        message: "",
        current: 0,
        limit: Number.MAX_SAFE_INTEGER,
      };
    }
    const current = await db.auditLog.count({
      where: {
        organizationId: orgId,
        action: "generate",
        resource: "document",
        createdAt: { gte: startOfUtcMonth() },
      },
    });
    const limit = FREE_PLAN_MONTHLY_DOCUMENT_LIMIT;
    const allowed = current < limit;
    return {
      allowed,
      message: allowed
        ? ""
        : `Document generation limit reached (${current}/${limit}) this month on the Free plan. Please upgrade.`,
      current,
      limit,
    };
  }

  if (feature === "claude_classification") {
    const paid = isPaidPlan(plan);
    return {
      allowed: paid,
      message: paid
        ? "Claude-powered classification is available on your plan."
        : "Upgrade for full Claude classification; the Free plan uses the built-in demo classifier.",
      current: paid ? 1 : 0,
      limit: paid ? 1 : 0,
    };
  }

  return { allowed: true, message: "", current: 0, limit: 0 };
}

// ─── Systems CRUD ────────────────────────────────────────────────────────

export async function createSystemAction(formData: FormData) {
  const user = await getOrCreateDbUser();
  if (!user) throw new Error("Not authenticated");

  const count = await db.aiSystem.count({
    where: { organizationId: user.organizationId },
  });
  const org = await db.organization.findUnique({
    where: { id: user.organizationId },
    select: { maxSystems: true },
  });
  if (!org) throw new Error("Organization not found");
  if (count >= org.maxSystems) {
    throw new Error(
      `System limit reached (${count}/${org.maxSystems}). Please upgrade your plan.`
    );
  }

  const system = await db.aiSystem.create({
    data: {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      sector: formData.get("sector") as string,
      useCase: formData.get("useCase") as string,
      provider: (formData.get("provider") as string) || null,
      version: (formData.get("version") as string) || null,
      dataInputs: (formData.get("dataInputs") as string) || null,
      decisionImpact: (formData.get("decisionImpact") as string) || null,
      endUsers: (formData.get("endUsers") as string) || null,
      deploymentRegion: (formData.get("deploymentRegion") as string) || "EU",
      organizationId: user.organizationId,
    },
  });

  await logAudit(
    user.id,
    user.organizationId,
    "create",
    "ai_system",
    system.id,
    system.id,
    `Created AI system: ${system.name}`
  );

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return system;
}

export async function updateSystemAction(systemId: string, formData: FormData) {
  const user = await getOrCreateDbUser();
  if (!user) throw new Error("Not authenticated");

  const system = await db.aiSystem.update({
    where: { id: systemId, organizationId: user.organizationId },
    data: {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      sector: formData.get("sector") as string,
      useCase: formData.get("useCase") as string,
      provider: (formData.get("provider") as string) || null,
      version: (formData.get("version") as string) || null,
      dataInputs: (formData.get("dataInputs") as string) || null,
      decisionImpact: (formData.get("decisionImpact") as string) || null,
      endUsers: (formData.get("endUsers") as string) || null,
      deploymentRegion: (formData.get("deploymentRegion") as string) || "EU",
    },
  });

  await logAudit(
    user.id,
    user.organizationId,
    "update",
    "ai_system",
    system.id,
    system.id,
    `Updated AI system: ${system.name}`
  );

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}

export async function deleteSystemAction(systemId: string) {
  const user = await getOrCreateDbUser();
  if (!user) throw new Error("Not authenticated");

  const system = await db.aiSystem.findUnique({ where: { id: systemId } });

  await db.aiSystem.delete({
    where: { id: systemId, organizationId: user.organizationId },
  });

  await logAudit(
    user.id,
    user.organizationId,
    "delete",
    "ai_system",
    systemId,
    undefined,
    `Deleted AI system: ${system?.name ?? systemId}`
  );

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}

// ─── Risk Classification ─────────────────────────────────────────────────

export async function classifySystemAction(
  systemId: string
): Promise<RiskClassificationResult> {
  const user = await getOrCreateDbUser();
  if (!user) throw new Error("Not authenticated");

  const system = await db.aiSystem.findUnique({
    where: { id: systemId, organizationId: user.organizationId },
  });
  if (!system) throw new Error("System not found");

  const orgRow = await db.organization.findUnique({
    where: { id: user.organizationId },
    select: { plan: true },
  });
  const orgPlan = normalizeOrgPlan(orgRow?.plan);

  const meta = {
    name: system.name,
    sector: system.sector,
    useCase: system.useCase,
    dataInputs: system.dataInputs ?? undefined,
    decisionImpact: system.decisionImpact ?? undefined,
    endUsers: system.endUsers ?? undefined,
    deploymentRegion: system.deploymentRegion ?? undefined,
  };

  const result = isPaidPlan(orgPlan)
    ? await classifyRiskTier(meta)
    : mockClassifyRiskTier(meta);

  await db.assessment.create({
    data: {
      aiSystemId: systemId,
      assessorId: user.id,
      riskTier: result.riskTier,
      confidence: result.confidence,
      justification: result.justification,
      keyArticles: JSON.stringify(result.keyArticles),
      requirements: JSON.stringify(result.requirements),
      recommendations: JSON.stringify(result.recommendations),
      exceptionsConsidered: result.exceptionsConsidered.length > 0
        ? JSON.stringify(result.exceptionsConsidered)
        : null,
      annexIiiCategory: result.annexIiiCategory,
      rawResponse: JSON.stringify(result),
    },
  });

  await db.aiSystem.update({
    where: { id: systemId },
    data: {
      riskTier: result.riskTier,
      complianceStatus:
        result.riskTier === "unacceptable"
          ? "non_compliant"
          : "under_review",
    },
  });

  await persistComplianceScore(systemId);

  await logAudit(
    user.id,
    user.organizationId,
    "classify",
    "assessment",
    systemId,
    systemId,
    `Classified "${system.name}" as ${result.riskTier.toUpperCase()} risk (confidence: ${(result.confidence * 100).toFixed(0)}%)`
  );

  await generateDeadlinesForSystem(systemId, result.riskTier, user.organizationId);

  revalidatePath("/inventory");
  revalidatePath("/classifier");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");

  void db.organization
    .findUnique({
      where: { id: user.organizationId },
      select: { agentmailInboxId: true },
    })
    .then((org) =>
      sendClassificationResult(
        user.email,
        system.name,
        result.riskTier,
        result.recommendations,
        org?.agentmailInboxId
      )
    )
    .catch((err) =>
      console.warn("[email] classification notification:", err)
    );

  return result;
}

// ─── Document Generation ──────────────────────────────────────────────────

export async function generateDocAction(
  systemId: string,
  sectionNumber: number,
  sectionTitle: string
) {
  const user = await getOrCreateDbUser();
  if (!user) throw new Error("Not authenticated");

  const system = await db.aiSystem.findUnique({
    where: { id: systemId, organizationId: user.organizationId },
  });
  if (!system) throw new Error("System not found");

  const orgRow = await db.organization.findUnique({
    where: { id: user.organizationId },
    select: { plan: true },
  });
  const orgPlan = normalizeOrgPlan(orgRow?.plan);
  if (!isPaidPlan(orgPlan)) {
    const start = startOfUtcMonth();
    const used = await db.auditLog.count({
      where: {
        organizationId: user.organizationId,
        action: "generate",
        resource: "document",
        createdAt: { gte: start },
      },
    });
    if (used >= FREE_PLAN_MONTHLY_DOCUMENT_LIMIT) {
      throw new Error(
        `Document generation limit reached (${used}/${FREE_PLAN_MONTHLY_DOCUMENT_LIMIT}) this month on the Free plan. Please upgrade.`
      );
    }
  }

  const content = await generateDocumentSection(
    {
      name: system.name,
      sector: system.sector,
      useCase: system.useCase,
      riskTier: system.riskTier,
      dataInputs: system.dataInputs ?? undefined,
      decisionImpact: system.decisionImpact ?? undefined,
    },
    sectionNumber,
    sectionTitle
  );

  const existing = await db.document.findFirst({
    where: { aiSystemId: systemId, section: sectionNumber },
  });

  let doc;
  if (existing) {
    doc = await db.document.update({
      where: { id: existing.id },
      data: {
        content,
        version: existing.version + 1,
        status: "draft",
      },
    });
  } else {
    doc = await db.document.create({
      data: {
        aiSystemId: systemId,
        authorId: user.id,
        title: `Section ${sectionNumber}: ${sectionTitle}`,
        type: "annex_iv",
        section: sectionNumber,
        content,
        status: "draft",
      },
    });
  }

  await logAudit(
    user.id,
    user.organizationId,
    "generate",
    "document",
    doc.id,
    systemId,
    `Generated Annex IV Section ${sectionNumber}: ${sectionTitle} for "${system.name}"`
  );

  await persistComplianceScore(systemId);

  revalidatePath("/documents");
  revalidatePath("/dashboard");
  return doc;
}

// ─── Incidents ───────────────────────────────────────────────────────────

export async function createIncidentAction(formData: FormData) {
  const user = await getOrCreateDbUser();
  if (!user) throw new Error("Not authenticated");

  const aiSystemId = (formData.get("aiSystemId") as string) || "";
  const system = await db.aiSystem.findFirst({
    where: { id: aiSystemId, organizationId: user.organizationId },
  });
  if (!system) throw new Error("AI system not found");

  const title = ((formData.get("title") as string) ?? "").trim();
  const description = ((formData.get("description") as string) ?? "").trim();
  if (!title || !description) throw new Error("Title and description are required");

  const occurredAt = new Date(formData.get("occurredAt") as string);
  const detectedAt = new Date(formData.get("detectedAt") as string);
  if (Number.isNaN(occurredAt.getTime()) || Number.isNaN(detectedAt.getTime())) {
    throw new Error("Invalid occurred or detected date");
  }

  const severityRaw = ((formData.get("severity") as string) || "medium").toLowerCase();
  const allowedSeverity = ["critical", "high", "medium", "low"] as const;
  const severity = allowedSeverity.includes(severityRaw as (typeof allowedSeverity)[number])
    ? severityRaw
    : "medium";

  const incident = await db.incident.create({
    data: {
      aiSystemId,
      reporterId: user.id,
      title,
      description,
      severity,
      occurredAt,
      detectedAt,
    },
  });

  await logAudit(
    user.id,
    user.organizationId,
    "create",
    "incident",
    incident.id,
    incident.aiSystemId,
    `Reported incident: ${incident.title}`
  );

  const ncaDeadline =
    severity === "critical"
      ? "Report to your national competent authority without undue delay — often within 72 hours of awareness (EU AI Act Art. 73)."
      : "Assess seriousness under Article 73; report to your NCA when required and document remediation in ComplianceForge.";

  void db.organization
    .findUnique({
      where: { id: user.organizationId },
      select: { agentmailInboxId: true },
    })
    .then((org) =>
      sendIncidentAlert(
        user.email,
        incident.title,
        incident.severity,
        system.name,
        ncaDeadline,
        org?.agentmailInboxId
      )
    )
    .catch((err) => console.warn("[email] incident alert:", err));

  await persistComplianceScore(aiSystemId);

  revalidatePath("/incidents");
  revalidatePath("/dashboard");
  return incident;
}

export async function updateIncidentStatusAction(incidentId: string, status: string) {
  const user = await getOrCreateDbUser();
  if (!user) throw new Error("Not authenticated");

  const allowed = ["open", "investigating", "resolved", "closed"] as const;
  if (!allowed.includes(status as (typeof allowed)[number])) {
    throw new Error("Invalid status");
  }

  const existing = await db.incident.findFirst({
    where: {
      id: incidentId,
      aiSystem: { organizationId: user.organizationId },
    },
    select: { id: true, aiSystemId: true, title: true },
  });
  if (!existing) throw new Error("Incident not found");

  await db.incident.update({
    where: { id: incidentId },
    data: { status },
  });

  await logAudit(
    user.id,
    user.organizationId,
    "update",
    "incident",
    incidentId,
    existing.aiSystemId,
    `Updated incident status to ${status}: ${existing.title}`
  );

  await persistComplianceScore(existing.aiSystemId);

  revalidatePath("/incidents");
  revalidatePath("/dashboard");
}

export async function markReportedToNcaAction(incidentId: string) {
  const user = await getOrCreateDbUser();
  if (!user) throw new Error("Not authenticated");

  const existing = await db.incident.findFirst({
    where: {
      id: incidentId,
      aiSystem: { organizationId: user.organizationId },
    },
    select: { id: true, aiSystemId: true, title: true, reportedToNca: true },
  });
  if (!existing) throw new Error("Incident not found");

  const now = new Date();
  await db.incident.update({
    where: { id: incidentId },
    data: {
      reportedToNca: true,
      ncaReportDate: now,
    },
  });

  await logAudit(
    user.id,
    user.organizationId,
    "update",
    "incident",
    incidentId,
    existing.aiSystemId,
    `Marked reported to NCA: ${existing.title}`
  );

  await persistComplianceScore(existing.aiSystemId);

  revalidatePath("/incidents");
  revalidatePath("/dashboard");
}

// ─── GitHub Repository Scanner ───────────────────────────────────────────

export type ScanRepoActionResult = {
  scanResultId: string;
  findings: ScanFinding[];
  repository: string;
  branch: string;
  truncatedTree?: boolean;
  errors: string[];
};

export async function scanRepoAction(
  repoUrl: string,
  token: string
): Promise<ScanRepoActionResult> {
  const user = await getOrCreateDbUser();
  if (!user) throw new Error("Not authenticated");

  const { owner, repo } = parseGithubRepo(repoUrl);
  const result = await scanRepository(token ?? "", owner, repo);

  const scan = await db.scanResult.create({
    data: {
      repository: result.repository,
      branch: result.branch,
      findings: JSON.stringify(result.findings),
      totalFindings: result.totalFindings,
      reviewRequired: result.reviewRequired,
      status: result.errors.length ? "completed_with_warnings" : "completed",
      scannedById: user.id,
      organizationId: user.organizationId,
    },
  });

  await logAudit(
    user.id,
    user.organizationId,
    "scan",
    "github_repository",
    scan.id,
    undefined,
    `Scanned ${result.repository} (${result.branch}) — ${result.totalFindings} finding(s)`
  );

  revalidatePath("/scanner");
  revalidatePath("/dashboard");

  return {
    scanResultId: scan.id,
    findings: result.findings,
    repository: result.repository,
    branch: result.branch,
    truncatedTree: result.truncatedTree,
    errors: result.errors,
  };
}

function resolveInventorySector(suggested: string): string {
  const hit = EU_AI_ACT_SECTORS.find(
    (s) => s.toLowerCase() === suggested.trim().toLowerCase()
  );
  return hit ?? "Other";
}

const ALLOWED_IMPORT_RISK = new Set([
  "unacceptable",
  "high",
  "limited",
  "minimal",
  "unassessed",
]);

export async function importScanFindingAction(
  scanResultId: string,
  findingIndex: number
): Promise<{ systemId: string }> {
  const user = await getOrCreateDbUser();
  if (!user) throw new Error("Not authenticated");

  const scan = await db.scanResult.findFirst({
    where: {
      id: scanResultId,
      organizationId: user.organizationId,
    },
  });
  if (!scan) throw new Error("Scan not found");

  let findings: ScanFinding[];
  try {
    findings = JSON.parse(scan.findings) as ScanFinding[];
  } catch {
    throw new Error("Invalid scan data");
  }
  if (!Array.isArray(findings) || findingIndex < 0 || findingIndex >= findings.length) {
    throw new Error("Finding not found");
  }

  const f = findings[findingIndex]!;
  const sector = resolveInventorySector(f.suggestedSector);
  const riskTier = ALLOWED_IMPORT_RISK.has(f.suggestedRiskTier.toLowerCase())
    ? f.suggestedRiskTier.toLowerCase()
    : "unassessed";

  const useCase =
    f.suggestedUseCase?.trim() ||
    `GitHub scan: ${f.framework}. Dependencies and files detected in ${scan.repository} — refine this description.`;

  const count = await db.aiSystem.count({
    where: { organizationId: user.organizationId },
  });
  const org = await db.organization.findUnique({
    where: { id: user.organizationId },
    select: { maxSystems: true },
  });
  if (!org) throw new Error("Organization not found");
  if (count >= org.maxSystems) {
    throw new Error(
      `System limit reached (${count}/${org.maxSystems}). Please upgrade your plan.`
    );
  }

  const system = await db.aiSystem.create({
    data: {
      name: f.name.slice(0, 255),
      description: f.suggestedUseCase?.trim() || null,
      sector,
      useCase: useCase.slice(0, 5000),
      provider: f.framework.slice(0, 255),
      sourceRepo: scan.repository,
      organizationId: user.organizationId,
      riskTier,
      complianceStatus: "not_started",
    },
  });

  await logAudit(
    user.id,
    user.organizationId,
    "create",
    "ai_system",
    system.id,
    system.id,
    `Imported from GitHub scan ${scan.repository}: ${system.name}`
  );

  await persistComplianceScore(system.id);

  revalidatePath("/inventory");
  revalidatePath("/scanner");
  revalidatePath("/dashboard");

  return { systemId: system.id };
}

// ─── Compliance Calendar ─────────────────────────────────────────────────

const DEADLINE_CATEGORIES = new Set([
  "general",
  "documentation",
  "assessment",
  "registration",
  "risk_management",
  "transparency",
  "enforcement",
]);

const DEADLINE_PRIORITIES = new Set(["low", "medium", "high"]);

export async function createDeadlineAction(formData: FormData) {
  const user = await getOrCreateDbUser();
  if (!user) throw new Error("Not authenticated");

  const title = ((formData.get("title") as string) ?? "").trim();
  if (!title) throw new Error("Title is required");

  const dueRaw = formData.get("dueDate") as string;
  const dueDate = new Date(dueRaw);
  if (Number.isNaN(dueDate.getTime())) throw new Error("Invalid due date");

  const descriptionRaw = (formData.get("description") as string) ?? "";
  const description = descriptionRaw.trim() || null;

  const priorityRaw = ((formData.get("priority") as string) || "medium").toLowerCase();
  const priority = DEADLINE_PRIORITIES.has(priorityRaw) ? priorityRaw : "medium";

  const categoryRaw = ((formData.get("category") as string) || "general").toLowerCase();
  const category = DEADLINE_CATEGORIES.has(categoryRaw) ? categoryRaw : "general";

  const aiSystemIdRaw = ((formData.get("aiSystemId") as string) ?? "").trim();
  let aiSystemId: string | null = null;
  if (aiSystemIdRaw) {
    const sys = await db.aiSystem.findFirst({
      where: { id: aiSystemIdRaw, organizationId: user.organizationId },
      select: { id: true },
    });
    if (!sys) throw new Error("AI system not found");
    aiSystemId = sys.id;
  }

  const assigneeIdRaw = ((formData.get("assigneeId") as string) ?? "").trim();
  let assigneeId: string | null = null;
  if (assigneeIdRaw) {
    const assignee = await db.user.findFirst({
      where: { id: assigneeIdRaw, organizationId: user.organizationId },
      select: { id: true },
    });
    if (!assignee) throw new Error("Assignee not found");
    assigneeId = assignee.id;
  }

  await db.complianceDeadline.create({
    data: {
      title,
      description,
      dueDate,
      priority,
      category,
      organizationId: user.organizationId,
      aiSystemId,
      assigneeId,
      status: "pending",
    },
  });

  revalidatePath("/calendar");
}

export async function completeDeadlineAction(deadlineId: string) {
  const user = await getOrCreateDbUser();
  if (!user) throw new Error("Not authenticated");

  const existing = await db.complianceDeadline.findFirst({
    where: { id: deadlineId, organizationId: user.organizationId },
    select: { id: true, status: true, aiSystemId: true },
  });
  if (!existing) throw new Error("Deadline not found");
  if (existing.status === "completed") return;

  const now = new Date();
  await db.complianceDeadline.update({
    where: { id: deadlineId },
    data: {
      status: "completed",
      completedAt: now,
    },
  });

  if (existing.aiSystemId) {
    await persistComplianceScore(existing.aiSystemId);
  } else {
    const systems = await db.aiSystem.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true },
    });
    await Promise.all(systems.map((s) => persistComplianceScore(s.id)));
  }

  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

// ─── API Keys (dashboard) ────────────────────────────────────────────────

export async function createApiKeyAction(name: string): Promise<{ key: string }> {
  const user = await getOrCreateDbUser();
  if (!user) throw new Error("Not authenticated");

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name is required");

  const { key, keyHash, keyPrefix } = generateApiKey();

  const created = await db.apiKey.create({
    data: {
      name: trimmed,
      keyHash,
      keyPrefix,
      organizationId: user.organizationId,
    },
  });

  await logAudit(
    user.id,
    user.organizationId,
    "create",
    "api_key",
    created.id,
    undefined,
    `Created API key: ${trimmed}`
  );

  revalidatePath("/settings");
  revalidatePath("/settings/api");

  return { key };
}

export async function revokeApiKeyAction(keyId: string): Promise<void> {
  const user = await getOrCreateDbUser();
  if (!user) throw new Error("Not authenticated");

  const row = await db.apiKey.findFirst({
    where: { id: keyId, organizationId: user.organizationId },
  });
  if (!row) throw new Error("API key not found");
  if (row.revokedAt) return;

  await db.apiKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  });

  await logAudit(
    user.id,
    user.organizationId,
    "update",
    "api_key",
    keyId,
    undefined,
    `Revoked API key: ${row.name}`
  );

  revalidatePath("/settings");
  revalidatePath("/settings/api");
}

// ─── Conformity Assessment ───────────────────────────────────────────────

function parseConformityRequirementsJson(
  json: string
): StoredConformityRequirement[] {
  try {
    const raw = JSON.parse(json) as unknown;
    if (!Array.isArray(raw)) return mergeRequirementState([]);
    return mergeRequirementState(raw as StoredConformityRequirement[]);
  } catch {
    return mergeRequirementState([]);
  }
}

export async function startConformityAssessmentAction(
  aiSystemId: string
): Promise<{ id: string }> {
  const user = await getOrCreateDbUser();
  if (!user) throw new Error("Not authenticated");

  const system = await db.aiSystem.findFirst({
    where: { id: aiSystemId, organizationId: user.organizationId },
    select: { id: true, name: true, riskTier: true },
  });
  if (!system) throw new Error("AI system not found");
  if (system.riskTier !== "high") {
    throw new Error("Conformity assessment applies only to high-risk AI systems");
  }

  const initial = buildInitialRequirementState();
  const pct = calculateCompletionPercentage(initial);
  const evidenceJson = JSON.stringify(collectEvidenceUrls(initial));

  const created = await db.conformityAssessment.create({
    data: {
      aiSystemId: system.id,
      assessorId: user.id,
      status: "in_progress",
      requirements: JSON.stringify(initial),
      evidenceUrls: evidenceJson,
      completionPct: pct,
    },
  });

  await logAudit(
    user.id,
    user.organizationId,
    "create",
    "conformity_assessment",
    created.id,
    system.id,
    `Started conformity assessment for "${system.name}"`
  );

  await persistComplianceScore(system.id);

  revalidatePath("/conformity");
  revalidatePath("/dashboard");
  return { id: created.id };
}

export async function updateConformityRequirementAction(
  assessmentId: string,
  requirementId: string,
  met: boolean,
  evidenceUrl: string,
  notes: string
): Promise<void> {
  const user = await getOrCreateDbUser();
  if (!user) throw new Error("Not authenticated");

  const assessment = await db.conformityAssessment.findFirst({
    where: {
      id: assessmentId,
      aiSystem: { organizationId: user.organizationId },
    },
    select: { id: true, status: true, requirements: true, aiSystemId: true },
  });
  if (!assessment) throw new Error("Assessment not found");
  if (assessment.status !== "in_progress") {
    throw new Error("Only in-progress assessments can be edited");
  }

  const list = parseConformityRequirementsJson(assessment.requirements);
  const idx = list.findIndex((r) => r.id === requirementId);
  if (idx === -1) throw new Error("Unknown requirement");

  const next = [...list];
  next[idx] = {
    ...next[idx]!,
    met,
    evidenceUrl: evidenceUrl.trim(),
    notes: notes.trim(),
  };

  const pct = calculateCompletionPercentage(next);
  const evidenceJson = JSON.stringify(collectEvidenceUrls(next));

  await db.conformityAssessment.update({
    where: { id: assessmentId },
    data: {
      requirements: JSON.stringify(next),
      evidenceUrls: evidenceJson,
      completionPct: pct,
    },
  });

  await persistComplianceScore(assessment.aiSystemId);

  revalidatePath("/conformity");
  revalidatePath("/dashboard");
}

export async function completeConformityAssessmentAction(
  assessmentId: string
): Promise<void> {
  const user = await getOrCreateDbUser();
  if (!user) throw new Error("Not authenticated");

  const assessment = await db.conformityAssessment.findFirst({
    where: {
      id: assessmentId,
      aiSystem: { organizationId: user.organizationId },
    },
    select: {
      id: true,
      status: true,
      requirements: true,
      aiSystemId: true,
    },
  });
  if (!assessment) throw new Error("Assessment not found");
  if (assessment.status === "completed") return;

  const list = parseConformityRequirementsJson(assessment.requirements);
  const pct = calculateCompletionPercentage(list);
  if (pct < 100) {
    throw new Error("All requirements must be marked as met before completion");
  }

  const now = new Date();
  await db.conformityAssessment.update({
    where: { id: assessmentId },
    data: {
      status: "completed",
      completedAt: now,
      completionPct: 100,
    },
  });

  await logAudit(
    user.id,
    user.organizationId,
    "complete",
    "conformity_assessment",
    assessmentId,
    assessment.aiSystemId,
    "Completed conformity assessment (100% requirements met)"
  );

  await persistComplianceScore(assessment.aiSystemId);

  revalidatePath("/conformity");
  revalidatePath("/dashboard");
}

export async function recalculateScoreAction(systemId: string): Promise<void> {
  const user = await getOrCreateDbUser();
  if (!user) throw new Error("Not authenticated");

  const system = await db.aiSystem.findFirst({
    where: { id: systemId, organizationId: user.organizationId },
    select: { id: true },
  });
  if (!system) throw new Error("System not found");

  await persistComplianceScore(systemId);

  revalidatePath("/dashboard");
  revalidatePath("/inventory");
}

export const addSystemAction = createSystemAction;
export const generateDocumentAction = generateDocAction;
