"use server";

import { db } from "./db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setAuthCookie, clearAuthCookie, getOrCreateDbUser } from "@/lib/auth";
import { classifyRiskTier, generateDocumentSection } from "@/lib/claude";
import type { RiskClassificationResult } from "@/lib/claude";

// ─── Auth ────────────────────────────────────────────────────────────────

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const name = formData.get("name") as string;

  if (!email) throw new Error("Email is required");

  await setAuthCookie({
    email,
    name: name || email.split("@")[0],
    role: "admin",
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  await clearAuthCookie();
  redirect("/login");
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

// ─── Systems CRUD ────────────────────────────────────────────────────────

export async function createSystemAction(formData: FormData) {
  const user = await getOrCreateDbUser();
  if (!user) throw new Error("Not authenticated");

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

  const result = await classifyRiskTier({
    name: system.name,
    sector: system.sector,
    useCase: system.useCase,
    dataInputs: system.dataInputs ?? undefined,
    decisionImpact: system.decisionImpact ?? undefined,
    endUsers: system.endUsers ?? undefined,
    deploymentRegion: system.deploymentRegion ?? undefined,
  });

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

  const scoreMap: Record<string, number> = {
    unacceptable: 0,
    high: 25,
    limited: 60,
    minimal: 85,
  };

  await db.aiSystem.update({
    where: { id: systemId },
    data: {
      riskTier: result.riskTier,
      complianceStatus:
        result.riskTier === "unacceptable"
          ? "non_compliant"
          : "under_review",
      complianceScore: scoreMap[result.riskTier] ?? 0,
    },
  });

  await logAudit(
    user.id,
    user.organizationId,
    "classify",
    "assessment",
    systemId,
    systemId,
    `Classified "${system.name}" as ${result.riskTier.toUpperCase()} risk (confidence: ${(result.confidence * 100).toFixed(0)}%)`
  );

  revalidatePath("/inventory");
  revalidatePath("/classifier");
  revalidatePath("/dashboard");

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

  revalidatePath("/documents");
  return doc;
}
