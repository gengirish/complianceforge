import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { db } from "@/server/db";
import { authOptions } from "@/lib/next-auth";

const AUTH_COOKIE = "cf_auth";

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
    return JSON.parse(auth.value) as AuthUser;
  } catch {
    return null;
  }
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieUser = await getCookieAuthUser();
  if (cookieUser) return cookieUser;

  const session = await getServerSession(authOptions);
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
  cookieStore.set(AUTH_COOKIE, JSON.stringify(user), {
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
  const session = await getServerSession(authOptions);
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
