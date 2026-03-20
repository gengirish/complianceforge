import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType,
} from "docx";
import { z } from "zod";
import { getOrCreateDbUser } from "@/lib/auth";
import {
  type CompliancePackAssessment,
  type CompliancePackDocument,
  type CompliancePackIncident,
  type CompliancePackSystem,
  compliancePackBaseFilename,
  generateCompliancePackHtml,
} from "@/lib/export-templates";
import { db } from "@/server/db";

export const runtime = "nodejs";
export const maxDuration = 120;

type RouteParams = { params: Promise<{ systemId: string }> };

function attachmentDisposition(baseName: string, ext: string): string {
  const full = `${baseName}${ext}`;
  const ascii = full.replace(/[^\x20-\x7E]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(full)}`;
}

function bufferToReadableStream(buf: Buffer): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(buf));
      controller.close();
    },
  });
}

async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const puppeteer = (await import("puppeteer")).default;
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 90_000 });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", right: "12mm", bottom: "18mm", left: "12mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function latestAnnexIvBySection<
  T extends { type: string; section: number; version: number },
>(docs: T[]): T[] {
  const m = new Map<number, T>();
  for (const d of docs) {
    if (d.type !== "annex_iv" || d.section < 1 || d.section > 17) continue;
    if (!m.has(d.section)) m.set(d.section, d);
  }
  return [...m.values()].sort((a, b) => a.section - b.section);
}

function chunkDocxText(text: string, max = 6000): string[] {
  if (!text) return [""];
  const out: string[] = [];
  let rest = text;
  while (rest.length > max) {
    let cut = rest.lastIndexOf("\n", max);
    if (cut < max / 2) cut = max;
    out.push(rest.slice(0, cut));
    rest = rest.slice(cut).trimStart();
  }
  out.push(rest);
  return out;
}

async function buildCompliancePackDocxBuffer(
  system: CompliancePackSystem,
  assessments: CompliancePackAssessment[],
  documents: CompliancePackDocument[],
  incidents: CompliancePackIncident[]
): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({
      text: "EU Artificial Intelligence Act — Compliance pack",
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({
      text: system.name,
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph(`Organization: ${system.organization.name}`),
    new Paragraph(
      `Generated: ${new Date().toLocaleString("en-GB")} · Regulation (EU) 2024/1689`
    ),
    new Paragraph(
      `Risk tier: ${system.riskTier} · Compliance score: ${system.complianceScore}% · Status: ${system.complianceStatus.replace(/_/g, " ")}`
    ),
    new Paragraph({ text: "Executive summary", heading: HeadingLevel.HEADING_2 }),
    new Paragraph(
      `${system.name} (${system.sector}). Use case: ${system.useCase}. Annex IV documents on file: ${documents.length}. Assessments: ${assessments.length}. Incidents: ${incidents.length}.`
    ),
    new Paragraph({ text: "System overview", heading: HeadingLevel.HEADING_2 })
  );

  const overviewLines = [
    `Provider: ${system.provider ?? "—"}`,
    `Version: ${system.version ?? "—"}`,
    `Deployment: ${system.deploymentRegion}`,
    `Data inputs: ${system.dataInputs ?? "—"}`,
    `Decision impact: ${system.decisionImpact ?? "—"}`,
    `End users: ${system.endUsers ?? "—"}`,
    `Source repo: ${system.sourceRepo ?? "—"}`,
  ];
  overviewLines.forEach((line) => children.push(new Paragraph(line)));
  if (system.description) {
    children.push(new Paragraph({ text: "Description", heading: HeadingLevel.HEADING_3 }));
    chunkDocxText(system.description).forEach((c) => children.push(new Paragraph(c)));
  }

  children.push(
    new Paragraph({ text: "Risk classification & assessments", heading: HeadingLevel.HEADING_2 })
  );
  if (assessments.length === 0) {
    children.push(new Paragraph("No assessments on file."));
  } else {
    for (const a of assessments) {
      children.push(
        new Paragraph({
          text: `${a.type.replace(/_/g, " ")} — ${a.riskTier} (${(a.confidence * 100).toFixed(0)}% confidence)`,
          heading: HeadingLevel.HEADING_3,
        }),
        new Paragraph(`Date: ${a.createdAt.toLocaleString("en-GB")}`)
      );
      chunkDocxText(a.justification).forEach((c) => children.push(new Paragraph(c)));
      if (a.complianceGaps) {
        children.push(new Paragraph({ text: "Compliance gaps", heading: HeadingLevel.HEADING_4 }));
        chunkDocxText(a.complianceGaps).forEach((c) => children.push(new Paragraph(c)));
      }
    }
  }

  children.push(
    new Paragraph({ text: "Annex IV technical documentation (Article 11)", heading: HeadingLevel.HEADING_2 })
  );
  for (const d of documents) {
    children.push(
      new Paragraph({
        text: `Section ${d.section}: ${d.title} (v${d.version}, ${d.status})`,
        heading: HeadingLevel.HEADING_3,
      })
    );
    chunkDocxText(d.content).forEach((c) => children.push(new Paragraph(c)));
  }

  children.push(new Paragraph({ text: "Incident log", heading: HeadingLevel.HEADING_2 }));

  const headerRow = new TableRow({
    children: ["Occurred", "Title", "Severity", "Status", "NCA"].map(
      (h) => new TableCell({ children: [new Paragraph(h)] })
    ),
  });

  const dataRows =
    incidents.length === 0
      ? [
          new TableRow({
            children: [
              new TableCell({
                columnSpan: 5,
                children: [new Paragraph("No incidents recorded.")],
              }),
            ],
          }),
        ]
      : incidents.map(
          (inc) =>
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph(inc.occurredAt.toLocaleDateString("en-GB"))],
                }),
                new TableCell({ children: [new Paragraph(inc.title)] }),
                new TableCell({ children: [new Paragraph(inc.severity)] }),
                new TableCell({ children: [new Paragraph(inc.status)] }),
                new TableCell({
                  children: [new Paragraph(inc.reportedToNca ? "Yes" : "No")],
                }),
              ],
            })
        );

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...dataRows],
    })
  );

  if (incidents.length > 0) {
    children.push(
      new Paragraph({ text: "Incident descriptions", heading: HeadingLevel.HEADING_3 })
    );
    for (const inc of incidents) {
      children.push(
        new Paragraph({ text: inc.title, heading: HeadingLevel.HEADING_4 }),
        new Paragraph(inc.description)
      );
    }
  }

  const doc = new Document({
    title: `Compliance pack — ${system.name}`,
    description: "EU AI Act documentation export from ComplianceForge",
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const user = await getOrCreateDbUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { systemId } = await params;
  const idParse = z.string().uuid().safeParse(systemId);
  if (!idParse.success) {
    return NextResponse.json({ error: "Invalid system id" }, { status: 400 });
  }

  const formatRaw = req.nextUrl.searchParams.get("format") ?? "html";
  const format = formatRaw.toLowerCase();
  if (!["html", "pdf", "docx"].includes(format)) {
    return NextResponse.json(
      { error: 'Invalid format. Use "html", "pdf", or "docx".' },
      { status: 400 }
    );
  }

  const system = await db.aiSystem.findFirst({
    where: { id: systemId, organizationId: user.organizationId },
    include: {
      organization: true,
      assessments: { orderBy: { createdAt: "desc" } },
      documents: { orderBy: [{ section: "asc" }, { version: "desc" }] },
      incidents: { orderBy: { occurredAt: "desc" } },
    },
  });

  if (!system) {
    return NextResponse.json({ error: "System not found" }, { status: 404 });
  }

  const { assessments, documents: rawDocuments, incidents, organization, ...rest } =
    system;
  const annexDocuments = latestAnnexIvBySection(rawDocuments);

  const packSystem = { ...rest, organization };
  const html = generateCompliancePackHtml(
    packSystem,
    assessments,
    annexDocuments,
    incidents
  );

  const base = compliancePackBaseFilename(system.name);

  if (format === "html") {
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": attachmentDisposition(base, ".html"),
        "Cache-Control": "private, no-store",
      },
    });
  }

  if (format === "pdf") {
    try {
      const pdfBuffer = await htmlToPdfBuffer(html);
      return new Response(bufferToReadableStream(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": attachmentDisposition(base, ".pdf"),
          "Cache-Control": "private, no-store",
        },
      });
    } catch (e) {
      console.error("[export] PDF generation failed", e);
      return NextResponse.json(
        { error: "PDF generation failed. Ensure Chromium is available for Puppeteer." },
        { status: 503 }
      );
    }
  }

  const docxBuffer = await buildCompliancePackDocxBuffer(
    packSystem,
    assessments,
    annexDocuments,
    incidents
  );

  return new Response(bufferToReadableStream(docxBuffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": attachmentDisposition(base, ".docx"),
      "Cache-Control": "private, no-store",
    },
  });
}
