import { describe, expect, it, vi, beforeEach } from "vitest";

const dbMock = vi.hoisted(() => ({
  apiKey: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findFirst: vi.fn(),
  },
}));

vi.mock("@/server/db", () => ({ db: dbMock }));

import { createHash } from "node:crypto";
import {
  generateApiKey,
  getOrganizationActorUserId,
  hashApiKey,
  validateApiKey,
} from "@/lib/api-auth";

const HEX_SHA256 = /^[a-f0-9]{64}$/;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("hashApiKey & generateApiKey", () => {
  it("generateApiKey returns a key prefixed with cf_", () => {
    const { key } = generateApiKey();
    expect(key.startsWith("cf_")).toBe(true);
  });

  it("generateApiKey populates key, keyHash, and keyPrefix", () => {
    const out = generateApiKey();
    expect(out.key.length).toBeGreaterThan(4);
    expect(out.keyHash.length).toBe(64);
    expect(out.keyPrefix).toBe(out.key.slice(0, 12));
    expect(HEX_SHA256.test(out.keyHash)).toBe(true);
  });

  it("hashApiKey is deterministic and SHA-256 hex", () => {
    const raw = "cf_test_deterministic_key";
    const once = hashApiKey(raw);
    expect(once).toBe(createHash("sha256").update(raw, "utf8").digest("hex"));
    expect(HEX_SHA256.test(once)).toBe(true);
  });

  it("hashApiKey differs for different inputs", () => {
    expect(hashApiKey("cf_a")).not.toBe(hashApiKey("cf_b"));
  });
});

describe("validateApiKey", () => {
  it("rejects missing Authorization", async () => {
    const res = await validateApiKey(new Request("https://x"));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.response.status).toBe(401);
  });

  it("rejects non-Bearer header", async () => {
    const res = await validateApiKey(
      new Request("https://x", { headers: { Authorization: "Basic x" } })
    );
    expect(res.ok).toBe(false);
  });

  it("rejects tokens not starting with cf_", async () => {
    const res = await validateApiKey(
      new Request("https://x", {
        headers: { Authorization: "Bearer sk_live_abc" },
      })
    );
    expect(res.ok).toBe(false);
  });

  it("rejects unknown or revoked keys", async () => {
    dbMock.apiKey.findFirst.mockResolvedValueOnce(null);
    const token = "cf_not_in_db";
    const res = await validateApiKey(
      new Request("https://x", {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    expect(res.ok).toBe(false);
    expect(dbMock.apiKey.findFirst).toHaveBeenCalledWith({
      where: { keyHash: hashApiKey(token), revokedAt: null },
      include: { organization: true },
    });
  });

  it("accepts a valid key and updates lastUsedAt", async () => {
    const token = "cf_validtoken";
    const record = {
      id: "key1",
      keyHash: hashApiKey(token),
      organization: { id: "org1", name: "Org" },
    };
    dbMock.apiKey.findFirst.mockResolvedValueOnce(record);
    dbMock.apiKey.update.mockResolvedValueOnce({});

    const res = await validateApiKey(
      new Request("https://x", {
        headers: { Authorization: `Bearer ${token}` },
      })
    );

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.ctx.organization).toEqual(record.organization);
      expect(res.ctx.apiKey).toMatchObject({ id: "key1", keyHash: record.keyHash });
      expect("organization" in res.ctx.apiKey).toBe(false);
    }
    expect(dbMock.apiKey.update).toHaveBeenCalledWith({
      where: { id: "key1" },
      data: { lastUsedAt: expect.any(Date) },
    });
  });
});

describe("getOrganizationActorUserId", () => {
  it("returns first user id or null", async () => {
    dbMock.user.findFirst.mockResolvedValueOnce({ id: "u1" });
    await expect(getOrganizationActorUserId("org1")).resolves.toBe("u1");
    expect(dbMock.user.findFirst).toHaveBeenCalledWith({
      where: { organizationId: "org1" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    dbMock.user.findFirst.mockResolvedValueOnce(null);
    await expect(getOrganizationActorUserId("org1")).resolves.toBeNull();
  });
});
