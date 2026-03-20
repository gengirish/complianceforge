import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import type { ApiKey, Organization } from "@prisma/client";
import { db } from "@/server/db";

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey, "utf8").digest("hex");
}

export function generateApiKey(): { key: string; keyHash: string; keyPrefix: string } {
  const suffix = randomBytes(24).toString("base64url");
  const key = `cf_${suffix}`;
  const keyHash = hashApiKey(key);
  const keyPrefix = key.slice(0, 12);
  return { key, keyHash, keyPrefix };
}

export type ValidatedApiKeyContext = {
  apiKey: ApiKey;
  organization: Organization;
};

function unauthorized(message: string) {
  return NextResponse.json({ error: message }, { status: 401 });
}

export async function validateApiKey(
  request: Request
): Promise<{ ok: true; ctx: ValidatedApiKeyContext } | { ok: false; response: NextResponse }> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return { ok: false, response: unauthorized("Missing or invalid Authorization header") };
  }

  const token = authHeader.slice(7).trim();
  if (!token.startsWith("cf_")) {
    return { ok: false, response: unauthorized("Invalid API key format") };
  }

  const keyHash = hashApiKey(token);

  const record = await db.apiKey.findFirst({
    where: { keyHash, revokedAt: null },
    include: { organization: true },
  });

  if (!record) {
    return { ok: false, response: unauthorized("Invalid or revoked API key") };
  }

  await db.apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  });

  const { organization, ...apiKey } = record;
  return {
    ok: true,
    ctx: { apiKey, organization },
  };
}

/** First user in the org — used as assessor/reporter for API-only operations that require a User id. */
export async function getOrganizationActorUserId(
  organizationId: string
): Promise<string | null> {
  const user = await db.user.findFirst({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return user?.id ?? null;
}
