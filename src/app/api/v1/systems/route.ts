import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api-middleware";
import { validateApiKey } from "@/lib/api-auth";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { db } from "@/server/db";
import { createAiSystemSchema } from "@/types";

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

  const systems = await db.aiSystem.findMany({
    where: { organizationId: auth.ctx.organization.id },
    orderBy: { updatedAt: "desc" },
  });

  return addCorsHeaders(
    NextResponse.json({ data: systems }, { status: 200, headers: rateLimited.headers }),
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

  const parsed = createAiSystemSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      request,
      `Validation failed: ${parsed.error.issues.map((i) => i.message).join(", ")}`
    );
  }

  const o = body as Record<string, unknown>;
  const d = parsed.data;

  const system = await db.aiSystem.create({
    data: {
      name: d.name,
      sector: d.sector,
      useCase: d.useCase,
      description: d.description ?? null,
      provider: d.provider ?? null,
      version: d.version ?? null,
      dataInputs: d.dataInputs ?? null,
      decisionImpact: d.decisionImpact ?? null,
      endUsers: d.endUsers ?? null,
      deploymentRegion: d.deploymentRegion,
      sourceRepo: typeof o.sourceRepo === "string" ? o.sourceRepo : null,
      organizationId: auth.ctx.organization.id,
    },
  });

  return addCorsHeaders(
    NextResponse.json({ data: system }, { status: 201, headers: rateLimited.headers }),
    request
  );
}
