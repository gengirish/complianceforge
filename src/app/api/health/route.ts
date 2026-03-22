import { NextResponse } from "next/server";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const start = Date.now();
  const checks: Record<string, { status: string; latency_ms?: number; error?: string }> = {};

  // Database check
  try {
    const dbStart = Date.now();
    await db.$queryRaw`SELECT 1`;
    checks.database = { status: "healthy", latency_ms: Date.now() - dbStart };
  } catch (err) {
    checks.database = {
      status: "unhealthy",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }

  const allHealthy = Object.values(checks).every((c) => c.status === "healthy");

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      latency_ms: Date.now() - start,
      checks,
    },
    { status: allHealthy ? 200 : 503 }
  );
}
