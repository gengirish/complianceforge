import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { env } from "@/lib/env";
import { createChildLogger } from "@/lib/logger";

const authLogger = createChildLogger("auth");

const AUTH_COOKIE = "cf_auth";
const HMAC_SHA256_HEX_LEN = 64;

const DEV_ONLY_COOKIE_SECRET =
  "complianceforge-dev-only-cookie-hmac-secret-not-for-production";

function getCookieSigningSecret(): string {
  const secret = env.COOKIE_SECRET || env.NEXTAUTH_SECRET;
  if (secret) return secret;
  if (env.NODE_ENV === "production") {
    authLogger.warn(
      "COOKIE_SECRET and NEXTAUTH_SECRET are unset; using an insecure dev-only cookie signing secret. Set COOKIE_SECRET or NEXTAUTH_SECRET."
    );
  }
  return DEV_ONLY_COOKIE_SECRET;
}

function signPayload(payload: string): string {
  const hmac = createHmac("sha256", getCookieSigningSecret())
    .update(payload)
    .digest("hex");
  return `${payload}.${hmac}`;
}

function isAuthUser(value: unknown): value is AuthUser {
  if (typeof value !== "object" || value === null) return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.email === "string" &&
    typeof o.name === "string" &&
    typeof o.role === "string"
  );
}

function verifyAndParsePayload(signed: string): AuthUser | null {
  const lastDot = signed.lastIndexOf(".");
  if (lastDot < 0 || lastDot === signed.length - 1) return null;

  const payload = signed.slice(0, lastDot);
  const sigHex = signed.slice(lastDot + 1);
  if (sigHex.length !== HMAC_SHA256_HEX_LEN || !/^[0-9a-f]+$/i.test(sigHex)) {
    return null;
  }

  const expectedHex = createHmac("sha256", getCookieSigningSecret())
    .update(payload)
    .digest("hex");

  let sigBuf: Buffer;
  let expectedBuf: Buffer;
  try {
    sigBuf = Buffer.from(sigHex, "hex");
    expectedBuf = Buffer.from(expectedHex, "hex");
  } catch {
    return null;
  }
  if (sigBuf.length !== expectedBuf.length) return null;

  try {
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null;
  } catch {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(payload);
    if (!isAuthUser(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export interface AuthUser {
  email: string;
  name: string;
  role: string;
}

interface DbUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  organizationId: string;
}

async function getCookieAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const auth = cookieStore.get(AUTH_COOKIE);
    if (!auth?.value) return null;
    return verifyAndParsePayload(auth.value);
  } catch {
    return null;
  }
}

async function getNextAuthSession() {
  if (!env.NEXTAUTH_SECRET) return null;
  try {
    const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("@/lib/next-auth");
    return await getServerSession(authOptions);
  } catch {
    return null;
  }
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieUser = await getCookieAuthUser();
  if (cookieUser) return cookieUser;

  const session = await getNextAuthSession();
  const email = session?.user?.email;
  if (!email) return null;

  return {
    email,
    name: session.user.name ?? email.split("@")[0] ?? "User",
    role: session.user.role ?? "admin",
  };
}

export async function setAuthCookie(user: AuthUser): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, signPayload(JSON.stringify(user)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
}

export async function getOrCreateDbUser(): Promise<DbUser | null> {
  const session = await getNextAuthSession();
  if (session?.user?.id) {
    const bySession = await db.user.findUnique({
      where: { id: session.user.id },
    });
    if (bySession) return bySession;
  }

  const authUser = await getCookieAuthUser();
  if (!authUser) return null;

  try {
    let user = await db.user.findUnique({
      where: { email: authUser.email },
    });

    if (!user) {
      const org = await db.organization.create({
        data: {
          name: `${authUser.name ?? authUser.email.split("@")[0]}'s Organization`,
        },
      });

      user = await db.user.create({
        data: {
          email: authUser.email,
          name: authUser.name,
          role: authUser.role,
          organizationId: org.id,
        },
      });
    }

    return user;
  } catch {
    return null;
  }
}
