export const dynamic = "force-dynamic";

import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { getOrCreateDbUser } from "@/lib/auth";
import { db } from "@/server/db";
import { TeamClient } from "./team-client";

export default async function TeamSettingsPage() {
  const dbUser = await getOrCreateDbUser();
  if (!dbUser) redirect("/login");

  const [members, pendingInvites] = await Promise.all([
    db.user.findMany({
      where: { organizationId: dbUser.organizationId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
    db.invitation.findMany({
      where: {
        organizationId: dbUser.organizationId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-muted-foreground">
            Invite colleagues and manage roles for your organization.
          </p>
        </div>
        <Link
          href={"/settings" as Route}
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Back to settings
        </Link>
      </div>

      <TeamClient
        members={members.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
        }))}
        pendingInvites={pendingInvites.map((i) => ({
          ...i,
          expiresAt: i.expiresAt.toISOString(),
          createdAt: i.createdAt.toISOString(),
        }))}
        currentUserId={dbUser.id}
        actorRole={dbUser.role}
      />
    </div>
  );
}
