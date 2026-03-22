import { NextResponse } from "next/server";
import { classifyRiskTier } from "@/lib/claude";
import { withRateLimit } from "@/lib/api-middleware";
import { getOrganizationActorUserId, validateApiKey } from "@/lib/api-auth";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { db } from "@/server/db";

function notFound(request: Request) {
  return addCorsHeaders(
    NextResponse.json({ error: "System not found" }, { status: 404 }),
    request
  );
}

type RouteParams = { params: Promise<{ id: string }> };

const scoreMap: Record<string, number> = {
  unacceptable: 0,
  high: 25,
  limited: 60,
  minimal: 85,
};

export async function OPTIONS(req: Request) {
  return handleCorsPreFlight(req);
}

export async function POST(request: Request, { params }: RouteParams) {
  const token =
    request.headers.get("authorization")?.replace("Bearer ", "") ??
    request.headers.get("x-forwarded-for") ??
    "anonymous";
  const rateLimited = withRateLimit(request, token);
  if (!rateLimited.ok) return addCorsHeaders(rateLimited.response, request);

  const auth = await validateApiKey(request);
  if (!auth.ok) return addCorsHeaders(auth.response, request);

  const { id: systemId } = await params;
  const system = await db.aiSystem.findFirst({
    where: { id: systemId, organizationId: auth.ctx.organization.id },
  });
  if (!system) return notFound(request);

  const assessorId = await getOrganizationActorUserId(auth.ctx.organization.id);
  if (!assessorId) {
    return addCorsHeaders(
      NextResponse.json(
        { error: "Organization has no users to attribute this assessment to" },
        { status: 400 }
      ),
      request
    );
  }

  const result = await classifyRiskTier({
    name: system.name,
    sector: system.sector,
    useCase: system.useCase,
    dataInputs: system.dataInputs ?? undefined,
    decisionImpact: system.decisionImpact ?? undefined,
    endUsers: system.endUsers ?? undefined,
    deploymentRegion: system.deploymentRegion ?? undefined,
  });

  const assessment = await db.assessment.create({
    data: {
      aiSystemId: systemId,
      assessorId,
      riskTier: result.riskTier,
      confidence: result.confidence,
      justification: result.justification,
      keyArticles: JSON.stringify(result.keyArticles),
      requirements: JSON.stringify(result.requirements),
      recommendations: JSON.stringify(result.recommendations),
      exceptionsConsidered:
        result.exceptionsConsidered.length > 0
          ? JSON.stringify(result.exceptionsConsidered)
          : null,
      annexIiiCategory: result.annexIiiCategory,
      rawResponse: JSON.stringify(result),
    },
  });

  const updated = await db.aiSystem.update({
    where: { id: systemId },
    data: {
      riskTier: result.riskTier,
      complianceStatus:
        result.riskTier === "unacceptable" ? "non_compliant" : "under_review",
      complianceScore: scoreMap[result.riskTier] ?? 0,
    },
  });

  return addCorsHeaders(
    NextResponse.json(
      {
        data: {
          classification: result,
          assessment,
          system: updated,
        },
      },
      { status: 200, headers: rateLimited.headers }
    ),
    request
  );
}
