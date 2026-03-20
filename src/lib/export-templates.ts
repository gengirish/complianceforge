import { ANNEX_IV_SECTIONS } from "@/types";

export interface CompliancePackOrganization {
  name: string;
}

export interface CompliancePackSystem {
  id: string;
  name: string;
  description: string | null;
  sector: string;
  useCase: string;
  provider: string | null;
  version: string | null;
  dataInputs: string | null;
  decisionImpact: string | null;
  endUsers: string | null;
  deploymentRegion: string;
  riskTier: string;
  complianceStatus: string;
  complianceScore: number;
  sourceRepo: string | null;
  createdAt: Date;
  updatedAt: Date;
  organization: CompliancePackOrganization;
}

export interface CompliancePackAssessment {
  id: string;
  type: string;
  riskTier: string;
  confidence: number;
  justification: string;
  keyArticles: string;
  requirements: string;
  recommendations: string;
  exceptionsConsidered: string | null;
  annexIiiCategory: string | null;
  complianceGaps: string | null;
  createdAt: Date;
}

export interface CompliancePackDocument {
  id: string;
  title: string;
  section: number;
  version: number;
  content: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompliancePackIncident {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  reportedToNca: boolean;
  ncaReportDate: Date | null;
  rootCause: string | null;
  remediation: string | null;
  occurredAt: Date;
  detectedAt: Date;
  createdAt: Date;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(d: Date, locale = "en-GB"): string {
  return d.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(d: Date, locale = "en-GB"): string {
  return d.toLocaleString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseJsonStringArray(raw: string): string[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

function annexTitleForSection(section: number): string {
  const row = ANNEX_IV_SECTIONS.find((s) => s.number === section);
  return row?.title ?? `Section ${section}`;
}

function slugFilenamePart(name: string): string {
  return name
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48) || "system";
}

export function compliancePackBaseFilename(systemName: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return `compliance-pack-${slugFilenamePart(systemName)}-${day}`;
}

export function generateCompliancePackHtml(
  system: CompliancePackSystem,
  assessments: CompliancePackAssessment[],
  documents: CompliancePackDocument[],
  incidents: CompliancePackIncident[]
): string {
  const generatedAt = new Date();
  const sectionsWithDocs = new Set(documents.map((d) => d.section));
  const annexCoverage = ANNEX_IV_SECTIONS.filter((s) =>
    sectionsWithDocs.has(s.number)
  ).length;
  const openIncidents = incidents.filter(
    (i) => i.status.toLowerCase() !== "closed" && i.status.toLowerCase() !== "resolved"
  ).length;

  const checklist: { label: string; ok: boolean; ref: string }[] = [
    {
      label: "AI system registered in inventory with sector and use case",
      ok: Boolean(system.name && system.sector && system.useCase),
      ref: "Art. 49 (EU database) / internal inventory",
    },
    {
      label: "Risk classification performed (not “unassessed”)",
      ok: system.riskTier !== "unassessed",
      ref: "Arts. 6–7, Annex III",
    },
    {
      label: "Latest self- or formal assessment recorded",
      ok: assessments.length > 0,
      ref: "Art. 9, Annex IX",
    },
    {
      label: "Annex IV technical documentation (Article 11) — section coverage",
      ok: annexCoverage >= 17,
      ref: "Art. 11, Annex IV",
    },
    {
      label: "Post-market monitoring & incident logging process evidenced",
      ok: incidents.length > 0 || annexCoverage >= 14,
      ref: "Art. 72, Art. 73",
    },
    {
      label: "Human oversight measures documented (Annex IV §11)",
      ok: sectionsWithDocs.has(11),
      ref: "Art. 14, Annex IV §11",
    },
    {
      label: "Transparency / instructions for use documented (Annex IV §12)",
      ok: sectionsWithDocs.has(12),
      ref: "Art. 13, Annex IV §12",
    },
    {
      label: "Conformity assessment / QMS alignment documented where applicable",
      ok: sectionsWithDocs.has(13),
      ref: "Art. 43, Annex IV §13",
    },
  ];

  const checklistDone = checklist.filter((c) => c.ok).length;

  const tocItems: { id: string; label: string }[] = [
    { id: "executive-summary", label: "Executive summary" },
    { id: "system-overview", label: "System overview" },
    { id: "risk-classification", label: "Risk classification & assessment" },
    ...documents.map((d) => ({
      id: `chapter-${d.section}`,
      label: `Annex IV — §${d.section} ${d.title}`,
    })),
    { id: "incident-log", label: "Incident log" },
    { id: "compliance-checklist", label: "Compliance checklist" },
    { id: "references", label: "Regulatory references" },
  ];

  const assessmentBlocks = assessments.map((a, idx) => {
    const articles = parseJsonStringArray(a.keyArticles);
    const reqs = parseJsonStringArray(a.requirements);
    const recs = parseJsonStringArray(a.recommendations);
    return `
    <section class="assessment-block">
      <h4 class="assessment-heading">Assessment ${assessments.length - idx} — ${escapeHtml(a.type.replace(/_/g, " "))}</h4>
      <p class="meta">Recorded: ${formatDateTime(a.createdAt)} · Model confidence: ${(a.confidence * 100).toFixed(0)}%</p>
      <dl class="grid-dl">
        <dt>Assigned risk tier</dt><dd><strong>${escapeHtml(a.riskTier)}</strong></dd>
        ${a.annexIiiCategory ? `<dt>Annex III category</dt><dd>${escapeHtml(a.annexIiiCategory)}</dd>` : ""}
      </dl>
      <h5>Justification</h5>
      <div class="doc-body preformatted">${escapeHtml(a.justification)}</div>
      ${
        articles.length
          ? `<h5>Key articles cited</h5><ul>${articles.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`
          : ""
      }
      ${
        reqs.length
          ? `<h5>Requirements considered</h5><ul>${reqs.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`
          : ""
      }
      ${
        recs.length
          ? `<h5>Recommendations</h5><ul>${recs.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`
          : ""
      }
      ${a.exceptionsConsidered ? `<h5>Exceptions considered</h5><div class="doc-body preformatted">${escapeHtml(a.exceptionsConsidered)}</div>` : ""}
      ${a.complianceGaps ? `<h5>Compliance gaps</h5><div class="doc-body preformatted">${escapeHtml(a.complianceGaps)}</div>` : ""}
    </section>`;
  });

  const documentChapters = documents
    .map((doc) => {
      const annexLabel = annexTitleForSection(doc.section);
      return `
  <section id="chapter-${doc.section}" class="chapter annex-chapter">
    <h2 class="chapter-title"><span class="section-num">Annex IV §${doc.section}</span> ${escapeHtml(doc.title)}</h2>
    <p class="chapter-sub">${escapeHtml(annexLabel)} · Version ${doc.version} · ${escapeHtml(doc.status)} · Updated ${formatDate(doc.updatedAt)}</p>
    <div class="doc-body preformatted">${escapeHtml(doc.content)}</div>
  </section>`;
    })
    .join("\n");

  const incidentRows =
    incidents.length === 0
      ? `<tr><td colspan="6" class="empty-cell">No incidents recorded for this system.</td></tr>`
      : incidents
          .map(
            (inc) => `
    <tr>
      <td>${formatDate(inc.occurredAt)}</td>
      <td>${escapeHtml(inc.title)}</td>
      <td>${escapeHtml(inc.severity)}</td>
      <td>${escapeHtml(inc.status)}</td>
      <td>${inc.reportedToNca ? "Yes" : "No"}</td>
      <td class="preformatted small">${escapeHtml(inc.description.slice(0, 280))}${inc.description.length > 280 ? "…" : ""}</td>
    </tr>`
          )
          .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>EU AI Act Compliance Pack — ${escapeHtml(system.name)}</title>
  <style>
    :root {
      --eu-blue: #003399;
      --eu-blue-light: #0a44c2;
      --text: #1a1a1a;
      --muted: #4a5568;
      --border: #cbd5e1;
      --bg-subtle: #f1f5f9;
    }
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.45;
      color: var(--text);
      margin: 0;
      padding: 0;
      background: #fff;
    }
    @page {
      size: A4;
      margin: 18mm 16mm 20mm 16mm;
    }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .screen-hint { display: none !important; }
      a { color: inherit; text-decoration: none; }
    }
    .eu-banner {
      background: linear-gradient(90deg, var(--eu-blue) 0%, var(--eu-blue-light) 100%);
      color: #fff;
      padding: 10px 20px;
      font-size: 9pt;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .cover {
      min-height: 100vh;
      padding: 24mm 18mm;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: center;
      border-top: 6px solid var(--eu-blue);
    }
    .cover h1 {
      font-size: 26pt;
      font-weight: 700;
      margin: 0 0 8px 0;
      line-height: 1.15;
      color: var(--eu-blue);
    }
    .cover .subtitle {
      font-size: 13pt;
      color: var(--muted);
      margin: 0 0 28px 0;
    }
    .cover-meta {
      margin-top: auto;
      padding-top: 16mm;
      border-top: 1px solid var(--border);
      font-size: 10pt;
    }
    .cover-meta dt {
      font-weight: 600;
      color: var(--muted);
      float: left;
      clear: left;
      width: 140px;
      margin: 0 0 6px 0;
    }
    .cover-meta dd { margin: 0 0 6px 150px; }
    .cover .act-ref {
      margin-top: 12mm;
      font-size: 9pt;
      color: var(--muted);
      max-width: 85%;
    }
    .toc {
      page-break-after: always;
      padding: 12mm 0 0 0;
    }
    .toc h2 {
      font-size: 16pt;
      color: var(--eu-blue);
      border-bottom: 2px solid var(--eu-blue);
      padding-bottom: 6px;
      margin-top: 0;
    }
    .toc ol {
      margin: 12px 0 0 0;
      padding-left: 22px;
    }
    .toc li { margin: 8px 0; }
    .toc a { color: var(--eu-blue-light); }
    .content-section {
      margin-bottom: 10mm;
    }
    .content-section h2 {
      font-size: 15pt;
      color: var(--eu-blue);
      border-bottom: 1px solid var(--border);
      padding-bottom: 4px;
      margin-top: 0;
    }
    #executive-summary { page-break-before: avoid; }
    .chapter {
      page-break-before: always;
    }
    .chapter:first-of-type { page-break-before: auto; }
    .annex-chapter .chapter-title {
      font-size: 14pt;
      margin-bottom: 4px;
    }
    .section-num {
      display: inline-block;
      background: var(--bg-subtle);
      padding: 2px 8px;
      border-radius: 4px;
      margin-right: 8px;
      font-size: 11pt;
    }
    .chapter-sub { font-size: 9pt; color: var(--muted); margin-top: 0; }
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin: 12px 0;
    }
    @media print {
      .summary-grid { break-inside: avoid; }
    }
    .summary-card {
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px 14px;
      background: var(--bg-subtle);
    }
    .summary-card .label { font-size: 8pt; text-transform: uppercase; color: var(--muted); letter-spacing: 0.05em; }
    .summary-card .value { font-size: 18pt; font-weight: 700; color: var(--eu-blue); margin-top: 4px; }
    .summary-card .value.sm { font-size: 13pt; }
    dl.grid-dl {
      display: grid;
      grid-template-columns: 160px 1fr;
      gap: 6px 16px;
      margin: 12px 0;
      font-size: 10pt;
    }
    dl.grid-dl dt { color: var(--muted); margin: 0; }
    dl.grid-dl dd { margin: 0; }
    .doc-body.preformatted {
      white-space: pre-wrap;
      word-wrap: break-word;
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 12px 14px;
      background: #fafafa;
      margin: 10px 0;
      font-size: 10pt;
    }
    .assessment-block {
      border-left: 4px solid var(--eu-blue);
      padding-left: 14px;
      margin: 16px 0;
      break-inside: avoid;
    }
    .assessment-heading { margin: 0 0 6px 0; font-size: 12pt; }
    .meta { font-size: 9pt; color: var(--muted); margin: 0 0 10px 0; }
    table.incidents {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin: 12px 0;
    }
    table.incidents th, table.incidents td {
      border: 1px solid var(--border);
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
    }
    table.incidents th { background: var(--bg-subtle); font-weight: 600; }
    .empty-cell { text-align: center; color: var(--muted); padding: 20px !important; }
    .small { font-size: 8.5pt; }
    .checklist {
      list-style: none;
      padding: 0;
      margin: 12px 0;
    }
    .checklist li {
      padding: 10px 12px;
      margin: 6px 0;
      border: 1px solid var(--border);
      border-radius: 4px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      break-inside: avoid;
    }
    .checklist li.ok { background: #f0fdf4; border-color: #86efac; }
    .checklist li.warn { background: #fffbeb; border-color: #fcd34d; }
    .check-mark { font-weight: 700; flex-shrink: 0; width: 22px; }
    .checklist .ref { display: block; font-size: 8pt; color: var(--muted); margin-top: 4px; }
    .screen-hint {
      background: #eff6ff;
      border: 1px solid #93c5fd;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 9pt;
      margin-bottom: 14px;
    }
    .references ul { font-size: 9pt; color: var(--muted); }
    h3 { font-size: 12pt; margin: 18px 0 8px 0; }
    h4, h5 { font-size: 10.5pt; margin: 14px 0 6px 0; }
    footer.pack-footer {
      margin-top: 14mm;
      padding-top: 8px;
      border-top: 1px solid var(--border);
      font-size: 8pt;
      color: var(--muted);
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="eu-banner">ComplianceForge · EU Artificial Intelligence Act — Regulation (EU) 2024/1689</div>

  <section class="cover" id="cover">
    <h1>${escapeHtml(system.name)}</h1>
    <p class="subtitle">Technical &amp; compliance documentation pack</p>
    <dl class="cover-meta">
      <dt>Organization</dt><dd>${escapeHtml(system.organization.name)}</dd>
      <dt>Deployment region</dt><dd>${escapeHtml(system.deploymentRegion)}</dd>
      <dt>Recorded risk tier</dt><dd><strong>${escapeHtml(system.riskTier)}</strong></dd>
      <dt>Compliance score</dt><dd><strong>${system.complianceScore}%</strong> (${escapeHtml(system.complianceStatus.replace(/_/g, " "))})</dd>
      <dt>Pack generated</dt><dd>${formatDateTime(generatedAt)}</dd>
    </dl>
    <p class="act-ref">
      This pack consolidates inventory data, classification outcomes, Annex IV documentation (Article 11),
      assessment records, and incident history to support internal governance and regulatory dialogue.
      It does not replace legal advice or notified body opinions.
    </p>
  </section>

  <nav class="toc" aria-label="Table of contents">
    <h2>Table of contents</h2>
    <ol>
      ${tocItems.map((item) => `<li><a href="#${item.id}">${escapeHtml(item.label)}</a></li>`).join("\n      ")}
    </ol>
  </nav>

  <p class="screen-hint no-print">
    <strong>Print to PDF:</strong> Use your browser’s print dialog (Ctrl+P) and choose “Save as PDF” for a portable document.
  </p>

  <section id="executive-summary" class="content-section">
    <h2>Executive summary</h2>
    <p>
      <strong>${escapeHtml(system.name)}</strong> is registered in sector <em>${escapeHtml(system.sector)}</em>.
      The declared use case is documented below. As of ${formatDate(generatedAt)}, the system is classified as
      <strong>${escapeHtml(system.riskTier)}</strong> with an overall compliance score of <strong>${system.complianceScore}%</strong>.
    </p>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="label">Annex IV sections on file</div>
        <div class="value sm">${annexCoverage} / ${ANNEX_IV_SECTIONS.length}</div>
      </div>
      <div class="summary-card">
        <div class="label">Assessments archived</div>
        <div class="value sm">${assessments.length}</div>
      </div>
      <div class="summary-card">
        <div class="label">Incidents (total)</div>
        <div class="value sm">${incidents.length}</div>
      </div>
      <div class="summary-card">
        <div class="label">Open / active incidents</div>
        <div class="value sm">${openIncidents}</div>
      </div>
    </div>
    <p>
      Checklist completion: <strong>${checklistDone}</strong> of <strong>${checklist.length}</strong> governance indicators satisfied
      (see <a href="#compliance-checklist">Compliance checklist</a>).
    </p>
  </section>

  <section id="system-overview" class="content-section chapter">
    <h2>System overview</h2>
    <dl class="grid-dl">
      <dt>Name</dt><dd>${escapeHtml(system.name)}</dd>
      <dt>Sector</dt><dd>${escapeHtml(system.sector)}</dd>
      <dt>Use case</dt><dd>${escapeHtml(system.useCase)}</dd>
      <dt>Provider</dt><dd>${system.provider ? escapeHtml(system.provider) : "—"}</dd>
      <dt>Version</dt><dd>${system.version ? escapeHtml(system.version) : "—"}</dd>
      <dt>Source repository</dt><dd>${system.sourceRepo ? escapeHtml(system.sourceRepo) : "—"}</dd>
      <dt>Data inputs</dt><dd>${system.dataInputs ? escapeHtml(system.dataInputs) : "—"}</dd>
      <dt>Decision impact</dt><dd>${system.decisionImpact ? escapeHtml(system.decisionImpact) : "—"}</dd>
      <dt>End users</dt><dd>${system.endUsers ? escapeHtml(system.endUsers) : "—"}</dd>
    </dl>
    ${system.description ? `<h3>Description</h3><div class="doc-body preformatted">${escapeHtml(system.description)}</div>` : ""}
    <footer class="pack-footer">System record last updated: ${formatDateTime(system.updatedAt)} · Internal ID: ${escapeHtml(system.id)}</footer>
  </section>

  <section id="risk-classification" class="content-section chapter">
    <h2>Risk classification &amp; assessment</h2>
    <p>
      Inventory risk tier: <strong>${escapeHtml(system.riskTier)}</strong>.
      Compliance status: <strong>${escapeHtml(system.complianceStatus.replace(/_/g, " "))}</strong>.
    </p>
    <h3>Assessment details</h3>
    ${
      assessments.length
        ? assessmentBlocks.join("\n")
        : `<p><em>No formal assessment records are stored for this system yet.</em></p>`
    }
  </section>

  <section class="content-section">
    <h2 id="annex-iv-docs" style="page-break-before: always;">Annex IV technical documentation</h2>
    <p style="font-size: 9pt; color: var(--muted); margin-top: -6px;">
      Article 11 of Regulation (EU) 2024/1689 requires providers of high-risk AI systems to draw up technical documentation
      meeting the elements set out in Annex IV. Each subsection below corresponds to a generated or uploaded record in ComplianceForge.
    </p>
  </section>
  ${documentChapters}

  <section id="incident-log" class="content-section chapter">
    <h2>Incident log</h2>
    <p style="font-size: 9pt; color: var(--muted);">
      Article 73 requires providers to report serious incidents to the market surveillance authority without undue delay.
      The table below reflects records captured in this application.
    </p>
    <table class="incidents">
      <thead>
        <tr>
          <th>Occurred</th>
          <th>Title</th>
          <th>Severity</th>
          <th>Status</th>
          <th>NCA reported</th>
          <th>Summary</th>
        </tr>
      </thead>
      <tbody>${incidentRows}</tbody>
    </table>
  </section>

  <section id="compliance-checklist" class="content-section chapter">
    <h2>Compliance checklist</h2>
    <p>Indicator summary: <strong>${checklistDone} / ${checklist.length}</strong> items satisfied based on current data.</p>
    <ul class="checklist">
      ${checklist
        .map(
          (c) => `
      <li class="${c.ok ? "ok" : "warn"}">
        <span class="check-mark">${c.ok ? "✓" : "○"}</span>
        <span>${escapeHtml(c.label)}<span class="ref">${escapeHtml(c.ref)}</span></span>
      </li>`
        )
        .join("")}
    </ul>
  </section>

  <section id="references" class="content-section chapter">
    <h2>Regulatory references</h2>
    <ul>
      <li>Regulation (EU) 2024/1689 (Artificial Intelligence Act)</li>
      <li>Article 11 &amp; Annex IV — Technical documentation</li>
      <li>Articles 9–15 — Risk management, data, transparency, human oversight, accuracy, cybersecurity</li>
      <li>Articles 72–73 — Post-market monitoring and serious incidents</li>
      <li>Annex III — High-risk AI use cases (where applicable)</li>
    </ul>
    <footer class="pack-footer">
      Generated by ComplianceForge. This document is confidential to ${escapeHtml(system.organization.name)} unless otherwise agreed.
    </footer>
  </section>
</body>
</html>`;
}
