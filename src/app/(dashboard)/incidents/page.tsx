export const dynamic = "force-dynamic";

import { db } from "@/server/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { IncidentsClient } from "./client";

export default async function IncidentsPage() {
  const user = await getOrCreateDbUser();
  if (!user) return null;

  const [incidents, systems] = await Promise.all([
    db.incident.findMany({
      where: { aiSystem: { organizationId: user.organizationId } },
      include: {
        aiSystem: true,
        reporter: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.aiSystem.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const serializedIncidents = incidents.map((i) => ({
    id: i.id,
    aiSystemId: i.aiSystemId,
    reporterId: i.reporterId,
    title: i.title,
    description: i.description,
    severity: i.severity,
    status: i.status,
    reportedToNca: i.reportedToNca,
    ncaReportDate: i.ncaReportDate?.toISOString() ?? null,
    rootCause: i.rootCause,
    remediation: i.remediation,
    occurredAt: i.occurredAt.toISOString(),
    detectedAt: i.detectedAt.toISOString(),
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
    aiSystem: {
      id: i.aiSystem.id,
      name: i.aiSystem.name,
    },
    reporter: {
      id: i.reporter.id,
      email: i.reporter.email,
      name: i.reporter.name,
    },
  }));

  return <IncidentsClient incidents={serializedIncidents} systems={systems} />;
}
