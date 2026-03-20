/** Inline-CSS HTML fragments for AgentMail / EU AI Act branded transactional email. */

const brandName = "ComplianceForge";
const accent = "#22d3ee";
const surface = "#0f1419";
const card = "#1a2332";
const muted = "#94a3b8";
const danger = "#f87171";

function shell(inner: string, footerNote?: string): string {
  const note =
    footerNote ??
    "This message relates to your EU AI Act compliance workspace. Regulation (EU) 2024/1689.";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background-color:${surface};font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#e2e8f0;line-height:1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${surface};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:${card};border-radius:12px;overflow:hidden;border:1px solid #334155;">
        <tr><td style="padding:24px 28px;background:linear-gradient(135deg,#0c4a6e 0%,#164e63 100%);border-bottom:1px solid #334155;">
          <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${accent};">${brandName}</p>
          <p style="margin:8px 0 0;font-size:18px;font-weight:600;color:#f8fafc;">EU AI Act compliance</p>
        </td></tr>
        <tr><td style="padding:28px;">
          ${inner}
        </td></tr>
        <tr><td style="padding:16px 28px 24px;border-top:1px solid #334155;">
          <p style="margin:0;font-size:12px;color:${muted};">${note}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function classificationResultTemplate(
  systemName: string,
  riskTier: string,
  recommendations: string[]
): string {
  const tierLabel = riskTier.replace(/_/g, " ").toUpperCase();
  const recs =
    recommendations.length > 0
      ? `<ul style="margin:12px 0;padding-left:20px;color:#cbd5e1;">${recommendations
          .map((r) => `<li style="margin-bottom:8px;">${escapeHtml(r)}</li>`)
          .join("")}</ul>`
      : `<p style="color:${muted};font-size:14px;">No specific recommendations were returned for this run.</p>`;

  return shell(
    `<p style="margin:0 0 8px;font-size:14px;color:${muted};">Risk classification complete</p>
     <h1 style="margin:0 0 16px;font-size:22px;color:#f8fafc;">${escapeHtml(systemName)}</h1>
     <p style="margin:0 0 8px;font-size:14px;color:${muted};">Assigned tier (EU AI Act framework)</p>
     <p style="margin:0 0 20px;font-size:20px;font-weight:700;color:${accent};letter-spacing:0.02em;">${escapeHtml(tierLabel)}</p>
     <p style="margin:0 0 12px;font-size:14px;color:#cbd5e1;">Suggested next steps under Articles 8–15 and Annex IV (high-risk) or transparency rules (limited risk) as applicable:</p>
     ${recs}`
  );
}

export function incidentAlertTemplate(
  incidentTitle: string,
  severity: string,
  systemName: string,
  ncaDeadline: string
): string {
  const sev = severity.toLowerCase();
  const critical = sev === "critical";
  const headerBg = critical ? "#7f1d1d" : "#1e3a5f";
  const headerBorder = critical ? "#b91c1c" : "#0e7490";
  const inner = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;border-radius:8px;overflow:hidden;border:1px solid ${headerBorder};">
      <tr><td style="padding:14px 18px;background-color:${headerBg};">
        <p style="margin:0;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${critical ? "#fecaca" : accent};">${critical ? "Urgent — critical incident" : "Incident recorded"}</p>
        <p style="margin:6px 0 0;font-size:18px;font-weight:600;color:#fff;">${escapeHtml(incidentTitle)}</p>
      </td></tr></table>
     <p style="margin:0 0 6px;font-size:13px;color:${muted};">Affected AI system</p>
     <p style="margin:0 0 16px;font-size:16px;color:#f1f5f9;">${escapeHtml(systemName)}</p>
     <p style="margin:0 0 6px;font-size:13px;color:${muted};">Severity</p>
     <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:${critical ? danger : "#fbbf24"};">${escapeHtml(severity)}</p>
     <p style="margin:0 0 6px;font-size:13px;color:${muted};">NCA / reporting horizon</p>
     <p style="margin:0;font-size:14px;color:#cbd5e1;">${escapeHtml(ncaDeadline)}</p>
     <p style="margin:20px 0 0;font-size:13px;color:${muted};">Review the incident in ComplianceForge and align with Article 73 and national guidance on serious incidents.</p>`;

  return shell(inner);
}

export function deadlineReminderTemplate(
  deadlineTitle: string,
  dueDate: string,
  daysRemaining: number
): string {
  const urgent = daysRemaining <= 3;
  const badgeColor = urgent ? danger : accent;
  const inner = `<p style="margin:0 0 8px;font-size:14px;color:${muted};">Compliance calendar</p>
     <h1 style="margin:0 0 16px;font-size:20px;color:#f8fafc;">${escapeHtml(deadlineTitle)}</h1>
     <p style="margin:0 0 8px;font-size:14px;color:${muted};">Due date</p>
     <p style="margin:0 0 20px;font-size:17px;color:#e2e8f0;">${escapeHtml(dueDate)}</p>
     <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:8px;"><tr>
       <td style="background-color:#0f172a;border-radius:8px;padding:14px 20px;border:1px solid #334155;">
         <span style="font-size:28px;font-weight:800;color:${badgeColor};">${daysRemaining}</span>
         <span style="font-size:14px;color:${muted};margin-left:8px;">day${daysRemaining === 1 ? "" : "s"} remaining</span>
       </td>
     </tr></table>
     <p style="margin:16px 0 0;font-size:13px;color:${muted};">Map obligations to Annex IV documentation and conformity assessment timelines where your systems are high-risk under the EU AI Act.</p>`;

  return shell(inner);
}

export function teamInviteTemplate(
  inviterName: string,
  orgName: string,
  inviteUrl: string
): string {
  const inner = `<p style="margin:0 0 8px;font-size:14px;color:${muted};">Team invitation</p>
     <h1 style="margin:0 0 12px;font-size:22px;color:#f8fafc;">Join ${escapeHtml(orgName)}</h1>
     <p style="margin:0 0 24px;font-size:15px;color:#cbd5e1;"><strong style="color:#f1f5f9;">${escapeHtml(inviterName)}</strong> invited you to collaborate on EU AI Act compliance tracking in ComplianceForge.</p>
     <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:linear-gradient(135deg,#0891b2,#0e7490);">
       <a href="${escapeAttr(inviteUrl)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Accept invitation</a>
     </td></tr></table>
     <p style="margin:24px 0 0;font-size:12px;color:${muted};word-break:break-all;">If the button does not work, copy this link:<br/><span style="color:#94a3b8;">${escapeHtml(inviteUrl)}</span></p>`;

  return shell(inner);
}

export type WeeklyDigestStats = {
  totalSystems: number;
  highRiskSystems: number;
  overdueItems: number;
  averageComplianceScore: number;
};

export function weeklyDigestTemplate(orgName: string, stats: WeeklyDigestStats): string {
  const inner = `<p style="margin:0 0 8px;font-size:14px;color:${muted};">Weekly digest</p>
     <h1 style="margin:0 0 20px;font-size:22px;color:#f8fafc;">${escapeHtml(orgName)}</h1>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 10px;">
       <tr><td style="width:50%;padding:16px;background-color:#0f172a;border-radius:8px;border:1px solid #334155;vertical-align:top;">
         <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:${muted};">Systems in inventory</p>
         <p style="margin:6px 0 0;font-size:26px;font-weight:700;color:${accent};">${stats.totalSystems}</p>
       </td><td style="width:12px;"></td><td style="width:50%;padding:16px;background-color:#0f172a;border-radius:8px;border:1px solid #334155;vertical-align:top;">
         <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:${muted};">High-risk tier</p>
         <p style="margin:6px 0 0;font-size:26px;font-weight:700;color:#fbbf24;">${stats.highRiskSystems}</p>
       </td></tr>
       <tr><td style="padding:16px;background-color:#0f172a;border-radius:8px;border:1px solid #334155;">
         <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:${muted};">Overdue items</p>
         <p style="margin:6px 0 0;font-size:26px;font-weight:700;color:${stats.overdueItems > 0 ? danger : "#4ade80"};">${stats.overdueItems}</p>
       </td><td></td><td style="padding:16px;background-color:#0f172a;border-radius:8px;border:1px solid #334155;">
         <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:${muted};">Avg. compliance score</p>
         <p style="margin:6px 0 0;font-size:26px;font-weight:700;color:#a5b4fc;">${stats.averageComplianceScore}%</p>
       </td></tr>
     </table>
     <p style="margin:20px 0 0;font-size:13px;color:${muted};">Use this snapshot to prioritize Annex IV updates, risk management, and post-market monitoring under the EU AI Act.</p>`;

  return shell(inner);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}
