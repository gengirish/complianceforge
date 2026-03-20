export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  DIRECT_URL: process.env.DIRECT_URL ?? "",
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
  AGENTMAIL_API_KEY: process.env.AGENTMAIL_API_KEY ?? "",
  NODE_ENV: process.env.NODE_ENV ?? "development",
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "https://complianceforge-ai.com",
} as const;
