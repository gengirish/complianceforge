export const dynamic = "force-dynamic";

import Link from "next/link";
import type { Route } from "next";
import { getOrCreateDbUser } from "@/lib/auth";
import { db } from "@/server/db";
import { env } from "@/lib/env";
import { ApiKeysManager } from "./api-keys-manager";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function ApiSettingsPage() {
  const user = await getOrCreateDbUser();
  if (!user) {
    return null;
  }

  const rows = await db.apiKey.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      createdAt: true,
      lastUsedAt: true,
      revokedAt: true,
    },
  });

  const keys = rows.map((k) => ({
    id: k.id,
    name: k.name,
    keyPrefix: k.keyPrefix,
    createdAt: k.createdAt.toISOString(),
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    revokedAt: k.revokedAt?.toISOString() ?? null,
  }));

  const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2 w-fit" asChild>
            <Link href={"/settings" as Route}>
              <ArrowLeft className="h-4 w-4" />
              Back to settings
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">API keys</h1>
          <p className="text-muted-foreground">
            Manage keys for the public REST API ({baseUrl}/api/v1)
          </p>
        </div>
      </div>

      <ApiKeysManager keys={keys} baseUrl={baseUrl} />
    </div>
  );
}
