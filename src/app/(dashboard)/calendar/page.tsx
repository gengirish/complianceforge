export const dynamic = "force-dynamic";

import { db } from "@/server/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { CalendarClient } from "./client";

export default async function CalendarPage() {
  const user = await getOrCreateDbUser();
  if (!user) return null;

  const [deadlines, systems, teamMembers] = await Promise.all([
    db.complianceDeadline.findMany({
      where: { organizationId: user.organizationId },
      include: {
        aiSystem: { select: { id: true, name: true } },
        assignee: { select: { id: true, email: true, name: true } },
      },
      orderBy: { dueDate: "asc" },
    }),
    db.aiSystem.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.user.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { email: "asc" },
      select: { id: true, email: true, name: true },
    }),
  ]);

  const serialized = deadlines.map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    dueDate: d.dueDate.toISOString(),
    status: d.status,
    priority: d.priority,
    category: d.category,
    aiSystemId: d.aiSystemId,
    assigneeId: d.assigneeId,
    completedAt: d.completedAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    aiSystem: d.aiSystem,
    assignee: d.assignee,
  }));

  const grouped = {
    pending: serialized.filter((d) => d.status === "pending"),
    completed: serialized.filter((d) => d.status === "completed"),
  };

  return (
    <CalendarClient
      grouped={grouped}
      systems={systems}
      teamMembers={teamMembers}
    />
  );
}
