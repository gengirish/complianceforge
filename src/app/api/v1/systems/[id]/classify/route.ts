import { NextResponse } from "next/server";
import { classifyRiskTier } from "@/lib/claude";
import { getOrganizationActorUserId, validateApiKey } from "@/lib/api-auth";
import { db } from "@/server/db";

function notFound() {
  return NextResponse.json({ error: "System not found" }, { status: 404 });
}

type RouteParams = { params: Promise<{ id: string }> };

const scoreMap: Record<string, number> = {
  unacceptable: 0,
  high: 25,
  limited: 60,
  minimal: 85,
};

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await validateApiKey(request);
  if (!auth.ok) return auth.response;

  const { id: systemId } = await params;
  const system = await db.aiSystem.findFirst({
    where: { id: systemId, organizationId: auth.ctx.organization.id },
  });
  if (!system) return notFound();

  const assessorId = await getOrganizationActorUserId(auth.ctx.organization.id);
  if (!assessorId) {
    return NextResponse.json(
      { error: "Organization has no users to attribute this assessment to" },
      { status: 400 }
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

  return NextResponse.json(
    {
      data: {
        classification: result,
        assessment,
        system: updated,
      },
    },
    { status: 200 }
  );
}
