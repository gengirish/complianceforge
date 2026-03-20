import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-auth";
import { db } from "@/server/db";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  const auth = await validateApiKey(request);
  if (!auth.ok) return auth.response;

  const systems = await db.aiSystem.findMany({
    where: { organizationId: auth.ctx.organization.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ data: systems }, { status: 200 });
}

export async function POST(request: Request) {
  const auth = await validateApiKey(request);
  if (!auth.ok) return auth.response;

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
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const sector = typeof o.sector === "string" ? o.sector.trim() : "";
  const useCase = typeof o.useCase === "string" ? o.useCase.trim() : "";

  if (!name || !sector || !useCase) {
    return badRequest("name, sector, and useCase are required");
  }

  const system = await db.aiSystem.create({
    data: {
      name,
      sector,
      useCase,
      description: typeof o.description === "string" ? o.description : null,
      provider: typeof o.provider === "string" ? o.provider : null,
      version: typeof o.version === "string" ? o.version : null,
      dataInputs: typeof o.dataInputs === "string" ? o.dataInputs : null,
      decisionImpact: typeof o.decisionImpact === "string" ? o.decisionImpact : null,
      endUsers: typeof o.endUsers === "string" ? o.endUsers : null,
      deploymentRegion:
        typeof o.deploymentRegion === "string" && o.deploymentRegion.trim()
          ? o.deploymentRegion.trim()
          : "EU",
      sourceRepo: typeof o.sourceRepo === "string" ? o.sourceRepo : null,
      organizationId: auth.ctx.organization.id,
    },
  });

  return NextResponse.json({ data: system }, { status: 201 });
}
