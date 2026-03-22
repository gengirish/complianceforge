import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api-middleware";
import { getOrganizationActorUserId, validateApiKey } from "@/lib/api-auth";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { db } from "@/server/db";
import { createIncidentSchema } from "@/types";

function badRequest(request: Request, message: string) {
  return addCorsHeaders(NextResponse.json({ error: message }, { status: 400 }), request);
}

export async function OPTIONS(req: Request) {
  return handleCorsPreFlight(req);
}

export async function GET(request: Request) {
  const token =
    request.headers.get("authorization")?.replace("Bearer ", "") ??
    request.headers.get("x-forwarded-for") ??
    "anonymous";
  const rateLimited = withRateLimit(request, token);
  if (!rateLimited.ok) return addCorsHeaders(rateLimited.response, request);

  const auth = await validateApiKey(request);
  if (!auth.ok) return addCorsHeaders(auth.response, request);

  const incidents = await db.incident.findMany({
    where: { aiSystem: { organizationId: auth.ctx.organization.id } },
    orderBy: { createdAt: "desc" },
    include: {
      aiSystem: { select: { id: true, name: true } },
    },
  });

  return addCorsHeaders(
    NextResponse.json({ data: incidents }, { status: 200, headers: rateLimited.headers }),
    request
  );
}

export async function POST(request: Request) {
  const token =
    request.headers.get("authorization")?.replace("Bearer ", "") ??
    request.headers.get("x-forwarded-for") ??
    "anonymous";
  const rateLimited = withRateLimit(request, token);
  if (!rateLimited.ok) return addCorsHeaders(rateLimited.response, request);

  const auth = await validateApiKey(request);
  if (!auth.ok) return addCorsHeaders(auth.response, request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest(request, "Invalid JSON body");
  }

  if (!body || typeof body !== "object") {
    return badRequest(request, "Expected a JSON object");
  }

  const parsed = createIncidentSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      request,
      `Validation failed: ${parsed.error.issues.map((i) => i.message).join(", ")}`
    );
  }

  const o = body as Record<string, unknown>;
  const {
    aiSystemId,
    title,
    description,
    severity,
    occurredAt: occurredAtStr,
    detectedAt: detectedAtStr,
  } = parsed.data;

  const system = await db.aiSystem.findFirst({
    where: { id: aiSystemId, organizationId: auth.ctx.organization.id },
  });
  if (!system) {
    return addCorsHeaders(
      NextResponse.json({ error: "AI system not found" }, { status: 404 }),
      request
    );
  }

  const occurredAt = new Date(occurredAtStr);
  const detectedAt = new Date(detectedAtStr);

  if (Number.isNaN(occurredAt.getTime())) {
    return badRequest(request, "occurredAt must be a valid ISO date string");
  }
  if (Number.isNaN(detectedAt.getTime())) {
    return badRequest(request, "detectedAt must be a valid ISO date string");
  }

  const reporterId = await getOrganizationActorUserId(auth.ctx.organization.id);
  if (!reporterId) {
    return addCorsHeaders(
      NextResponse.json(
        { error: "Organization has no users to attribute this incident to" },
        { status: 400 }
      ),
      request
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

  return addCorsHeaders(
    NextResponse.json({ data: incident }, { status: 201, headers: rateLimited.headers }),
    request
  );
}
