import { AgentMailClient } from "agentmail";
import { env } from "@/lib/env";
import {
  classificationResultTemplate,
  deadlineReminderTemplate,
  incidentAlertTemplate,
  teamInviteTemplate,
  weeklyDigestTemplate,
  type WeeklyDigestStats,
} from "@/lib/email-templates";

let emailClient: AgentMailClient | null | undefined;

export function getEmailClient(): AgentMailClient | null {
  if (emailClient !== undefined) {
    return emailClient;
  }
  const key = env.AGENTMAIL_API_KEY.trim();
  if (!key) {
    emailClient = null;
    return null;
  }
  emailClient = new AgentMailClient({ apiKey: key });
  return emailClient;
}

function agentmailDomain(): string {
  const d = env.AGENTMAIL_DOMAIN.trim();
  return d || "complianceforge-ai.com";
}

function warnNoKey(context: string): void {
  console.warn(`[email] ${context}: AGENTMAIL_API_KEY not set; skipping send.`);
}

function warnNoInbox(context: string): void {
  console.warn(
    `[email] ${context}: no organization AgentMail inbox configured; skipping send.`
  );
}

/**
 * Sends via AgentMail from the given org inbox. Returns false if misconfigured or on error.
 * `inboxId` is the full inbox identifier (e.g. username@domain) stored on Organization.agentmailInboxId.
 */
export async function sendComplianceEmail(
  to: string,
  subject: string,
  text: string,
  html: string,
  inboxId?: string | null
): Promise<boolean> {
  const client = getEmailClient();
  if (!client) {
    warnNoKey("sendComplianceEmail");
    return false;
  }
  if (!inboxId?.trim()) {
    warnNoInbox("sendComplianceEmail");
    return false;
  }
  try {
    await client.inboxes.messages.send(inboxId.trim(), {
      to: to.trim(),
      subject,
      text,
      html,
    });
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[email] sendComplianceEmail failed: ${msg}`);
    return false;
  }
}

export async function sendClassificationResult(
  email: string,
  systemName: string,
  riskTier: string,
  recommendations: string[],
  inboxId?: string | null
): Promise<boolean> {
  const subject = `[ComplianceForge] Classification: ${systemName} — ${riskTier.toUpperCase()}`;
  const text = [
    `Your EU AI Act risk classification for "${systemName}" is complete.`,
    `Risk tier: ${riskTier.toUpperCase()}`,
    "",
    "Recommendations:",
    ...recommendations.map((r) => `• ${r}`),
    "",
    `— ComplianceForge · ${agentmailDomain()}`,
  ].join("\n");
  const html = classificationResultTemplate(systemName, riskTier, recommendations);
  return sendComplianceEmail(email, subject, text, html, inboxId);
}

export async function sendIncidentAlert(
  email: string,
  incidentTitle: string,
  severity: string,
  systemName: string,
  ncaDeadline: string,
  inboxId?: string | null
): Promise<boolean> {
  const subject = `[ComplianceForge] Incident: ${incidentTitle}`;
  const text = [
    `An incident was recorded in ComplianceForge.`,
    `Title: ${incidentTitle}`,
    `Severity: ${severity}`,
    `AI system: ${systemName}`,
    `NCA / reporting: ${ncaDeadline}`,
    "",
    "Review obligations under Article 73 (EU AI Act) and your national competent authority guidance.",
    "",
    `— ComplianceForge · ${agentmailDomain()}`,
  ].join("\n");
  const html = incidentAlertTemplate(incidentTitle, severity, systemName, ncaDeadline);
  return sendComplianceEmail(email, subject, text, html, inboxId);
}

export async function sendDeadlineReminder(
  email: string,
  deadlineTitle: string,
  dueDate: string,
  daysRemaining: number,
  systemName: string,
  inboxId?: string | null
): Promise<boolean> {
  const subject = `[ComplianceForge] Due in ${daysRemaining}d: ${deadlineTitle}`;
  const text = [
    `Deadline reminder (${systemName}).`,
    `Title: ${deadlineTitle}`,
    `Due: ${dueDate}`,
    `Days remaining: ${daysRemaining}`,
    "",
    "Align evidence and documentation with applicable EU AI Act articles for your risk tier.",
    "",
    `— ComplianceForge · ${agentmailDomain()}`,
  ].join("\n");
  const html = deadlineReminderTemplate(deadlineTitle, dueDate, daysRemaining);
  return sendComplianceEmail(email, subject, text, html, inboxId);
}

export async function sendTeamInvite(
  email: string,
  inviterName: string,
  orgName: string,
  inviteUrl: string,
  inboxId?: string | null
): Promise<boolean> {
  const subject = `[ComplianceForge] You're invited to ${orgName}`;
  const text = [
    `${inviterName} invited you to join ${orgName} on ComplianceForge.`,
    "",
    `Accept: ${inviteUrl}`,
    "",
    `— ComplianceForge · ${agentmailDomain()}`,
  ].join("\n");
  const html = teamInviteTemplate(inviterName, orgName, inviteUrl);
  return sendComplianceEmail(email, subject, text, html, inboxId);
}

export async function sendWeeklyDigest(
  email: string,
  orgName: string,
  stats: WeeklyDigestStats,
  inboxId?: string | null
): Promise<boolean> {
  const subject = `[ComplianceForge] Weekly digest — ${orgName}`;
  const text = [
    `Weekly compliance summary for ${orgName}`,
    `Systems: ${stats.totalSystems}`,
    `High-risk count: ${stats.highRiskSystems}`,
    `Overdue items: ${stats.overdueItems}`,
    `Average compliance score: ${stats.averageComplianceScore}%`,
    "",
    `— ComplianceForge · ${agentmailDomain()}`,
  ].join("\n");
  const html = weeklyDigestTemplate(orgName, stats);
  return sendComplianceEmail(email, subject, text, html, inboxId);
}

export type { WeeklyDigestStats };
