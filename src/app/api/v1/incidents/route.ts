import { NextResponse } from "next/server";
import { getOrganizationActorUserId, validateApiKey } from "@/lib/api-auth";
import { db } from "@/server/db";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  const auth = await validateApiKey(request);
  if (!auth.ok) return auth.response;

  const incidents = await db.incident.findMany({
    where: { aiSystem: { organizationId: auth.ctx.organization.id } },
    orderBy: { createdAt: "desc" },
    include: {
      aiSystem: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: incidents }, { status: 200 });
}

export async function POST(request: Request) {
  const auth = await validateApiKey(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!body || typeof body !== "object") {
    return badRequest("Expected a JSON object");
  }

  const o = body as Record<string, unknown>;
  const aiSystemId = typeof o.aiSystemId === "string" ? o.aiSystemId.trim() : "";
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const description = typeof o.description === "string" ? o.description.trim() : "";

  if (!aiSystemId || !title || !description) {
    return badRequest("aiSystemId, title, and description are required");
  }

  const system = await db.aiSystem.findFirst({
    where: { id: aiSystemId, organizationId: auth.ctx.organization.id },
  });
  if (!system) {
    return NextResponse.json({ error: "AI system not found" }, { status: 404 });
  }

  const occurredAt =
    typeof o.occurredAt === "string" ? new Date(o.occurredAt) : null;
  const detectedAt =
    typeof o.detectedAt === "string" ? new Date(o.detectedAt) : null;

  if (!occurredAt || Number.isNaN(occurredAt.getTime())) {
    return badRequest("occurredAt must be a valid ISO date string");
  }
  if (!detectedAt || Number.isNaN(detectedAt.getTime())) {
    return badRequest("detectedAt must be a valid ISO date string");
  }

  const severityRaw = (
    typeof o.severity === "string" ? o.severity : "medium"
  ).toLowerCase();
  const allowedSeverity = ["critical", "high", "medium", "low"] as const;
  const severity = allowedSeverity.includes(
    severityRaw as (typeof allowedSeverity)[number]
  )
    ? severityRaw
    : "medium";

  const reporterId = await getOrganizationActorUserId(auth.ctx.organization.id);
  if (!reporterId) {
    return NextResponse.json(
      { error: "Organization has no users to attribute this incident to" },
      { status: 400 }
    );
  }

  const allowedStatus = ["open", "investigating", "resolved", "closed"] as const;
  const status =
    typeof o.status === "string" &&
    allowedStatus.includes(o.status as (typeof allowedStatus)[number])
      ? o.status
      : "open";

  const incident = await db.incident.create({
    data: {
      aiSystemId,
      reporterId,
      title,
      description,
      severity,
      occurredAt,
      detectedAt,
      status,
      ...(typeof o.rootCause === "string" ? { rootCause: o.rootCause } : {}),
      ...(typeof o.remediation === "string" ? { remediation: o.remediation } : {}),
      ...(o.reportedToNca === true ? { reportedToNca: true } : {}),
    },
  });

  return NextResponse.json({ data: incident }, { status: 201 });
}
