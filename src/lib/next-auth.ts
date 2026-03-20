import "@/auth-types";
import type { NextAuthOptions } from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/server/db";
import { env } from "@/lib/env";

const prismaAdapter = PrismaAdapter(db);

export const authOptions: NextAuthOptions = {
  adapter: {
    ...prismaAdapter,
    createUser: async (data: Omit<AdapterUser, "id">) => {
      const org = await db.organization.create({
        data: {
          name: `${data.name ?? data.email?.split("@")[0] ?? "User"}'s Organization`,
        },
      });
      return db.user.create({
        data: {
          name: data.name,
          email: data.email!,
          emailVerified: data.emailVerified,
          image: data.image,
          organizationId: org.id,
          role: "admin",
        },
      });
    },
  },
  session: { strategy: "database" },
  pages: { signIn: "/login" },
  providers: [
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
      ? [
          GitHubProvider({
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  callbacks: {
    async session({ session, user }) {
      const row = await db.user.findUnique({
        where: { id: user.id },
        select: { id: true, role: true, organizationId: true },
      });
      if (session.user) {
        session.user.id = user.id;
        session.user.role = row?.role ?? "admin";
        session.user.organizationId = row?.organizationId ?? "";
      }
      return session;
    },
  },
  secret: env.NEXTAUTH_SECRET || undefined,
};
