import { z } from "zod";
import { createChildLogger } from "@/lib/logger";

const envLogger = createChildLogger("env");

const envSchema = z.object({
  // Database — empty at build time; Prisma errors at connection if unset
  DATABASE_URL: z.string().default(""),
  DIRECT_URL: z.string().default(""),

  NODE_ENV: z.preprocess((val) => {
    const s = typeof val === "string" ? val.trim() : "";
    return ["development", "production", "test"].includes(s)
      ? s
      : "development";
  }, z.enum(["development", "production", "test"])),

  // App — `z.string().url().default(...)` fails on empty env values; normalize first
  NEXT_PUBLIC_APP_URL: z.preprocess((val) => {
    const s = typeof val === "string" ? val.trim() : "";
    if (!s) return "http://localhost:3000";
    try {
      new URL(s);
      return s;
    } catch {
      envLogger.warn(
        { invalidUrl: s },
        "NEXT_PUBLIC_APP_URL is not a valid URL; using http://localhost:3000"
      );
      return "http://localhost:3000";
    }
  }, z.string().url()),

  // AI (optional but recommended)
  ANTHROPIC_API_KEY: z.string().default(""),

  // Email (optional)
  AGENTMAIL_API_KEY: z.string().default(""),
  AGENTMAIL_DOMAIN: z.string().default("complianceforge-ai.com"),

  // Stripe (optional)
  STRIPE_SECRET_KEY: z.string().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().default(""),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().default(""),

  // Auth - NextAuth (optional)
  NEXTAUTH_SECRET: z.string().default(""),
  NEXTAUTH_URL: z.string().default(""),

  // Auth - Cookie (HMAC); optional — `src/lib/auth.ts` uses COOKIE_SECRET || NEXTAUTH_SECRET
  COOKIE_SECRET: z.preprocess(
    (val) => (typeof val === "string" ? val.trim() : ""),
    z.string().default("")
  ),

  // Auth - OAuth providers (optional)
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  GITHUB_CLIENT_ID: z.string().default(""),
  GITHUB_CLIENT_SECRET: z.string().default(""),

  // Monitoring (optional)
  SENTRY_DSN: z.string().default(""),
  NEXT_PUBLIC_SENTRY_DSN: z.string().default(""),
});

type Env = z.infer<typeof envSchema>;

function warnRecommendedVars(data: Env): void {
  if (!data.DATABASE_URL.trim()) {
    envLogger.warn("DATABASE_URL is empty. Set it before connecting to the database.");
  }
  if (!data.ANTHROPIC_API_KEY.trim()) {
    envLogger.warn(
      "ANTHROPIC_API_KEY is empty. AI classification will not work until it is set."
    );
  }
  if (
    !data.COOKIE_SECRET.trim() &&
    !data.NEXTAUTH_SECRET.trim() &&
    data.NODE_ENV === "production"
  ) {
    envLogger.warn(
      "No cookie signing secret in production. Set COOKIE_SECRET or NEXTAUTH_SECRET (e.g. openssl rand -hex 32)."
    );
  }
  const oauthEnabled =
    data.GOOGLE_CLIENT_ID.trim() !== "" ||
    data.GITHUB_CLIENT_ID.trim() !== "";
  if (oauthEnabled && !data.NEXTAUTH_SECRET.trim()) {
    envLogger.warn(
      "OAuth is configured but NEXTAUTH_SECRET is empty. Set NEXTAUTH_SECRET for secure sessions."
    );
  }
  const stripePartial =
    [
      data.STRIPE_SECRET_KEY,
      data.STRIPE_WEBHOOK_SECRET,
      data.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    ].some((k) => k.trim() !== "") &&
    [
      data.STRIPE_SECRET_KEY,
      data.STRIPE_WEBHOOK_SECRET,
      data.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    ].some((k) => k.trim() === "");
  if (stripePartial) {
    envLogger.warn(
      "Stripe is partially configured. Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY together."
    );
  }
}

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (parsed.success) {
    warnRecommendedVars(parsed.data);
    return parsed.data;
  }

  envLogger.error(
    { fieldErrors: parsed.error.flatten().fieldErrors },
    "Invalid environment variables"
  );
  envLogger.warn(
    "Applying fallbacks for invalid values. Fix the issues above when possible."
  );

  const recovered = envSchema.safeParse({
    ...process.env,
    NODE_ENV: "development",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  });
  if (recovered.success) {
    warnRecommendedVars(recovered.data);
    return recovered.data;
  }

  envLogger.warn(
    {
      fieldErrors: recovered.error.flatten().fieldErrors,
    },
    "Some env values still invalid; using schema defaults only."
  );

  const fallback = envSchema.parse({});
  warnRecommendedVars(fallback);
  return fallback;
}

export const env = validateEnv();
