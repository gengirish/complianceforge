export const dynamic = "force-dynamic";

import { db } from "@/server/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { ClassifierClient } from "./client";

export default async function ClassifierPage() {
  const user = await getOrCreateDbUser();
  if (!user) return null;

  const systems = await db.aiSystem.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      sector: true,
      useCase: true,
      riskTier: true,
      dataInputs: true,
      decisionImpact: true,
      endUsers: true,
      deploymentRegion: true,
    },
  });

  return <ClassifierClient systems={systems} />;
}
