export const dynamic = "force-dynamic";

import { db } from "@/server/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { DocumentsClient } from "./client";

export default async function DocumentsPage() {
  const user = await getOrCreateDbUser();
  if (!user) return null;

  const systems = await db.aiSystem.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, riskTier: true, sector: true, useCase: true },
  });

  const documents = await db.document.findMany({
    where: {
      aiSystem: { organizationId: user.organizationId },
    },
    orderBy: { section: "asc" },
    include: { aiSystem: { select: { name: true } } },
  });

  const serializedDocs = documents.map((d) => ({
    ...d,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));

  return <DocumentsClient systems={systems} documents={serializedDocs} />;
}
