import { db } from "@/server/db";

const ENFORCEMENT_ISO = "2026-08-02T00:00:00.000Z";

function addDays(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

type GeneratedDeadlineInput = {
  title: string;
  description: string | null;
  dueDate: Date;
  category: string;
  priority: string;
};

function buildDeadlineTemplates(
  riskTier: string,
  referenceDate: Date
): GeneratedDeadlineInput[] {
  const tier = riskTier.toLowerCase();
  const templates: GeneratedDeadlineInput[] = [
    {
      title: "EU AI Act full enforcement",
      description:
        "General applicability date for the EU AI Act. Ensure organization-wide readiness.",
      dueDate: new Date(ENFORCEMENT_ISO),
      category: "enforcement",
      priority: "high",
    },
  ];

  if (tier === "high") {
    templates.push(
      {
        title: "Implement risk management system",
        description:
          "Establish and maintain a risk management system per high-risk provider obligations.",
        dueDate: addDays(referenceDate, 60),
        category: "risk_management",
        priority: "high",
      },
      {
        title: "Complete Annex IV documentation",
        description:
          "Prepare technical documentation in line with Annex IV for this high-risk AI system.",
        dueDate: addDays(referenceDate, 90),
        category: "documentation",
        priority: "high",
      },
      {
        title: "Complete conformity assessment",
        description:
          "Carry out the applicable conformity assessment procedure before placing on the market or putting into service.",
        dueDate: addDays(referenceDate, 120),
        category: "assessment",
        priority: "high",
      },
      {
        title: "Register in EU database",
        description:
          "Register the high-risk AI system in the EU database when required.",
        dueDate: addDays(referenceDate, 150),
        category: "registration",
        priority: "high",
      },
      {
        title: "Establish post-market monitoring",
        description:
          "Set up post-market monitoring processes for the lifecycle of the system.",
        dueDate: addDays(referenceDate, 180),
        category: "risk_management",
        priority: "medium",
      }
    );
  }

  if (tier === "limited") {
    templates.push({
      title: "Implement transparency disclosure",
      description:
        "Ensure users are informed they are interacting with an AI system, per limited-risk transparency rules.",
      dueDate: addDays(referenceDate, 60),
      category: "transparency",
      priority: "medium",
    });
  }

  return templates;
}

/**
 * Creates compliance deadlines for an AI system after risk classification.
 * Skips titles that already exist for the same system and organization.
 */
export async function generateDeadlinesForSystem(
  systemId: string,
  riskTier: string,
  orgId: string
): Promise<void> {
  const referenceDate = new Date();
  const templates = buildDeadlineTemplates(riskTier, referenceDate);
  const titles = templates.map((t) => t.title);

  const existing = await db.complianceDeadline.findMany({
    where: {
      organizationId: orgId,
      aiSystemId: systemId,
      title: { in: titles },
    },
    select: { title: true },
  });
  const existingTitles = new Set(existing.map((e) => e.title));
  const toCreate = templates.filter((t) => !existingTitles.has(t.title));

  if (toCreate.length === 0) return;

  await db.complianceDeadline.createMany({
    data: toCreate.map((t) => ({
      title: t.title,
      description: t.description,
      dueDate: t.dueDate,
      category: t.category,
      priority: t.priority,
      status: "pending",
      organizationId: orgId,
      aiSystemId: systemId,
    })),
  });
}
