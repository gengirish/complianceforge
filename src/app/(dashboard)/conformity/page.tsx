export const dynamic = "force-dynamic";

import { db } from "@/server/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { mergeRequirementState, type StoredConformityRequirement } from "@/lib/conformity-requirements";
import type { SerializedConformityAssessment } from "./types";
import { ConformityClient } from "./client";

export default async function ConformityPage() {
  const user = await getOrCreateDbUser();
  if (!user) return null;

  const [assessments, highRiskSystems] = await Promise.all([
    db.conformityAssessment.findMany({
      where: { aiSystem: { organizationId: user.organizationId } },
      include: {
        aiSystem: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.aiSystem.findMany({
      where: { organizationId: user.organizationId, riskTier: "high" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, sector: true, useCase: true },
    }),
  ]);

  const serializedAssessments: SerializedConformityAssessment[] =
    assessments.map((a) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(a.requirements) as unknown;
      } catch {
        parsed = [];
      }
      const merged = mergeRequirementState(
        Array.isArray(parsed)
          ? (parsed as StoredConformityRequirement[])
          : []
      );
      return {
        id: a.id,
        aiSystemId: a.aiSystemId,
        aiSystemName: a.aiSystem.name,
        assessorId: a.assessorId,
        status: a.status,
        completionPct: a.completionPct,
        requirements: merged,
        startedAt: a.startedAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
        completedAt: a.completedAt?.toISOString() ?? null,
      };
    });

  return (
    <ConformityClient
      assessments={serializedAssessments}
      highRiskSystems={highRiskSystems}
    />
  );
}
