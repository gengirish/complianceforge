export const dynamic = "force-dynamic";

import { db } from "@/server/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { ScannerClient } from "./client";

export default async function ScannerPage() {
  const user = await getOrCreateDbUser();
  if (!user) return null;

  const scans = await db.scanResult.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { scanDate: "desc" },
    take: 40,
    include: {
      scannedBy: { select: { name: true, email: true } },
    },
  });

  const history = scans.map((s) => ({
    id: s.id,
    repository: s.repository,
    branch: s.branch,
    scanDate: s.scanDate.toISOString(),
    totalFindings: s.totalFindings,
    reviewRequired: s.reviewRequired,
    status: s.status,
    scannedByName: s.scannedBy.name ?? s.scannedBy.email ?? "Unknown",
  }));

  return <ScannerClient history={history} />;
}
