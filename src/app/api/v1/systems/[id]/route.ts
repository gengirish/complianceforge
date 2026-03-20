import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-auth";
import { db } from "@/server/db";

function notFound() {
  return NextResponse.json({ error: "System not found" }, { status: 404 });
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await validateApiKey(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const system = await db.aiSystem.findFirst({
    where: { id, organizationId: auth.ctx.organization.id },
  });
  if (!system) return notFound();

  return NextResponse.json({ data: system }, { status: 200 });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await validateApiKey(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = await db.aiSystem.findFirst({
    where: { id, organizationId: auth.ctx.organization.id },
  });
  if (!existing) return notFound();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!body || typeof body !== "object") {
    return badRequest("Expected a JSON object");
  }

  const o = body as Record<string, unknown>;
  const data: Prisma.AiSystemUpdateInput = {};

  function setNullableString(key: keyof Prisma.AiSystemUpdateInput, raw: unknown) {
    if (raw === undefined) return;
    if (raw === null) {
      (data as Record<string, null>)[key as string] = null;
      return;
    }
    if (typeof raw !== "string") {
      return;
    }
    (data as Record<string, string>)[key as string] = raw;
  }

  if ("name" in o) {
    if (typeof o.name !== "string" || !o.name.trim()) {
      return badRequest("name must be a non-empty string");
    }
    data.name = o.name.trim();
  }
  setNullableString("description", o.description);
  if ("sector" in o) {
    if (typeof o.sector !== "string" || !o.sector.trim()) {
      return badRequest("sector must be a non-empty string");
    }
    data.sector = o.sector.trim();
  }
  if ("useCase" in o) {
    if (typeof o.useCase !== "string" || !o.useCase.trim()) {
      return badRequest("useCase must be a non-empty string");
    }
    data.useCase = o.useCase.trim();
  }
  setNullableString("provider", o.provider);
  setNullableString("version", o.version);
  setNullableString("dataInputs", o.dataInputs);
  setNullableString("decisionImpact", o.decisionImpact);
  setNullableString("endUsers", o.endUsers);
  if ("deploymentRegion" in o) {
    if (typeof o.deploymentRegion !== "string" || !o.deploymentRegion.trim()) {
      return badRequest("deploymentRegion must be a non-empty string");
    }
    data.deploymentRegion = o.deploymentRegion.trim();
  }
  setNullableString("sourceRepo", o.sourceRepo);
  if ("riskTier" in o && typeof o.riskTier === "string") {
    data.riskTier = o.riskTier;
  }
  if ("complianceStatus" in o && typeof o.complianceStatus === "string") {
    data.complianceStatus = o.complianceStatus;
  }
  if ("complianceScore" in o) {
    const n = o.complianceScore;
    const score =
      typeof n === "number" && Number.isInteger(n)
        ? n
        : typeof n === "string" && n.trim() !== ""
          ? parseInt(n, 10)
          : NaN;
    if (!Number.isNaN(score)) {
      data.complianceScore = score;
    }
  }

  if (Object.keys(data).length === 0) {
    return badRequest("No valid fields to update");
  }

  const system = await db.aiSystem.update({
    where: { id },
    data,
  });

  return NextResponse.json({ data: system }, { status: 200 });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await validateApiKey(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = await db.aiSystem.findFirst({
    where: { id, organizationId: auth.ctx.organization.id },
  });
  if (!existing) return notFound();

  await db.aiSystem.delete({ where: { id } });

  return NextResponse.json({ data: { id, deleted: true } }, { status: 200 });
}
