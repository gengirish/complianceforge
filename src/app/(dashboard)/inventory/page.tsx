export const dynamic = "force-dynamic";

import { db } from "@/server/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { InventoryClient } from "./client";

export default async function InventoryPage() {
  const user = await getOrCreateDbUser();
  if (!user) return null;

  const systems = await db.aiSystem.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
  });

  const serialized = systems.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  return <InventoryClient systems={serialized} />;
}
