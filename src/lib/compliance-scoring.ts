import { db } from "@/server/db";
import { ANNEX_IV_SECTIONS } from "@/types";

const MIN_SECTION_CONTENT_LEN = 80;

export const SCORE_BREAKDOWN = [
  {
    id: "risk_classification",
    label: "Risk classification",
    description: "System has an assessed risk tier (not unassessed).",
    maxPoints: 15,
  },
  {
    id: "annex_iv",
    label: "Annex IV documentation",
    description:
      "Base for technical documentation, plus points per section with substantive content.",
    maxPoints: 20 + 5 * ANNEX_IV_SECTIONS.length,
  },
  {
    id: "conformity_assessment",
    label: "Conformity assessment",
    description: "Started (+10) or completed (+15).",
    maxPoints: 15,
  },
  {
    id: "incident_response_plan",
    label: "Incident response plan",
    description:
      "Compliance item or documentation indicating an incident / Art. 73 response plan.",
    maxPoints: 10,
  },
  {
    id: "incidents_resolved",
    label: "Incidents & critical issues",
    description:
      "+10 when no open incidents; −5 per open critical incident.",
    maxPoints: 10,
  },
  {
    id: "post_market_monitoring",
    label: "Post-market monitoring",
    description: "Post-market monitoring deadline marked completed.",
    maxPoints: 10,
  },
  {
    id: "transparency_disclosure",
    label: "Transparency disclosure",
    description: "Transparency deadline completed or Annex IV Section 12 in place.",
    maxPoints: 10,
  },
] as const;

export type ScoreCriterionId = (typeof SCORE_BREAKDOWN)[number]["id"];

export type ComplianceCriterionScore = {
  id: ScoreCriterionId;
  label: string;
  earned: number;
  max: number;
  detail: string;
};

export type ComplianceScoreResult = {
  score: number;
  grade: ReturnType<typeof getScoreGrade>;
  criteria: ComplianceCriterionScore[];
};

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function getScoreGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

export type ScoreGradeStyle = {
  text: string;
  ring: string;
  stroke: string;
};

export function getScoreStyle(grade: string): ScoreGradeStyle {
  switch (grade) {
    case "A":
      return {
        text: "text-emerald-400",
        ring: "ring-emerald-500/40",
        stroke: "stroke-emerald-400",
      };
    case "B":
      return {
        text: "text-lime-400",
        ring: "ring-lime-500/40",
        stroke: "stroke-lime-400",
      };
    case "C":
      return {
        text: "text-amber-400",
        ring: "ring-amber-500/40",
        stroke: "stroke-amber-400",
      };
    case "D":
      return {
        text: "text-orange-400",
        ring: "ring-orange-500/40",
        stroke: "stroke-orange-400",
      };
    default:
      return {
        text: "text-red-400",
        ring: "ring-red-500/40",
        stroke: "stroke-red-400",
      };
  }
}

export function getScoreColor(grade: string): string {
  const s = getScoreStyle(grade);
  return `${s.text} ${s.ring} ${s.stroke}`;
}

function isOpenIncidentStatus(status: string): boolean {
  return status === "open" || status === "investigating";
}

export async function calculateComplianceScore(
  systemId: string
): Promise<ComplianceScoreResult> {
  const system = await db.aiSystem.findUnique({
    where: { id: systemId },
    include: {
      documents: {
        where: { type: "annex_iv" },
        select: { section: true, content: true },
      },
      conformityAssessments: {
        orderBy: { startedAt: "desc" },
        take: 3,
        select: { status: true, completedAt: true },
      },
      incidents: { select: { status: true, severity: true } },
      complianceDeadlines: {
        select: { title: true, category: true, status: true, description: true },
      },
    },
  });

  if (!system) {
    return {
      score: 0,
      grade: "F",
      criteria: SCORE_BREAKDOWN.map((b) => ({
        id: b.id,
        label: b.label,
        earned: 0,
        max: b.maxPoints,
        detail: "System not found",
      })) as ComplianceCriterionScore[],
    };
  }

  const criteria: ComplianceCriterionScore[] = [];

  const classified =
    system.riskTier !== "unassessed" && system.riskTier.length > 0;
  const riskEarned = classified ? 15 : 0;
  criteria.push({
    id: "risk_classification",
    label: SCORE_BREAKDOWN[0].label,
    earned: riskEarned,
    max: 15,
    detail: classified
      ? `Risk tier: ${system.riskTier}`
      : "Run risk classification to score this item.",
  });

  const substantiveSections = new Set<number>();
  for (const d of system.documents) {
    if (
      d.section >= 1 &&
      d.section <= ANNEX_IV_SECTIONS.length &&
      (d.content?.trim().length ?? 0) >= MIN_SECTION_CONTENT_LEN
    ) {
      substantiveSections.add(d.section);
    }
  }
  const hasAnnexBase = substantiveSections.size > 0;
  const annexBaseEarned = hasAnnexBase ? 20 : 0;
  const perSectionEarned = substantiveSections.size * 5;
  const annexMax = 20 + 5 * ANNEX_IV_SECTIONS.length;
  const annexEarned = annexBaseEarned + perSectionEarned;
  criteria.push({
    id: "annex_iv",
    label: SCORE_BREAKDOWN[1].label,
    earned: annexEarned,
    max: annexMax,
    detail: hasAnnexBase
      ? `${substantiveSections.size} Annex IV section(s) with substantive content`
      : "Generate Annex IV sections to unlock base and per-section points.",
  });

  const conf = system.conformityAssessments[0];
  const confCompleted =
    conf &&
    (conf.status === "completed" ||
      (conf.completedAt !== null && conf.completedAt !== undefined));
  const confStarted = Boolean(conf) && !confCompleted;
  let confEarned = 0;
  let confDetail = "No conformity assessment record yet.";
  if (confCompleted) {
    confEarned = 15;
    confDetail = "Conformity assessment completed.";
  } else if (confStarted) {
    confEarned = 10;
    confDetail = "Conformity assessment in progress.";
  }
  criteria.push({
    id: "conformity_assessment",
    label: SCORE_BREAKDOWN[2].label,
    earned: confEarned,
    max: 15,
    detail: confDetail,
  });

  const incidentPlanHit = system.complianceDeadlines.some((dl) => {
    const t = dl.title.toLowerCase();
    const desc = (dl.description ?? "").toLowerCase();
    return (
      t.includes("incident") ||
      t.includes("article 73") ||
      desc.includes("incident response")
    );
  });
  criteria.push({
    id: "incident_response_plan",
    label: SCORE_BREAKDOWN[3].label,
    earned: incidentPlanHit ? 10 : 0,
    max: 10,
    detail: incidentPlanHit
      ? "Incident / Art. 73 planning item present in compliance calendar."
      : "Add a calendar item or documentation for incident response.",
  });

  const openIncidents = system.incidents.filter((i) =>
    isOpenIncidentStatus(i.status)
  );
  const openCritical = openIncidents.filter(
    (i) => i.severity === "critical"
  ).length;
  let incidentScoreEarned = 0;
  if (openIncidents.length === 0) {
    incidentScoreEarned = 10;
  }
  incidentScoreEarned -= openCritical * 5;
  const incidentMax = 10;
  criteria.push({
    id: "incidents_resolved",
    label: SCORE_BREAKDOWN[4].label,
    earned: incidentScoreEarned,
    max: incidentMax,
    detail:
      openIncidents.length === 0
        ? "No open incidents."
        : `${openIncidents.length} open incident(s), ${openCritical} critical — resolve to recover points.`,
  });

  const pmmDone = system.complianceDeadlines.some(
    (dl) =>
      dl.status === "completed" &&
      dl.title.toLowerCase().includes("post-market")
  );
  criteria.push({
    id: "post_market_monitoring",
    label: SCORE_BREAKDOWN[5].label,
    earned: pmmDone ? 10 : 0,
    max: 10,
    detail: pmmDone
      ? "Post-market monitoring item completed."
      : 'Complete the "Establish post-market monitoring" deadline when applicable.',
  });

  const transparencyDeadlineDone = system.complianceDeadlines.some(
    (dl) => dl.category === "transparency" && dl.status === "completed"
  );
  const transparencyDoc = substantiveSections.has(12);
  const transparencyDone = transparencyDeadlineDone || transparencyDoc;
  criteria.push({
    id: "transparency_disclosure",
    label: SCORE_BREAKDOWN[6].label,
    earned: transparencyDone ? 10 : 0,
    max: 10,
    detail: transparencyDone
      ? transparencyDeadlineDone
        ? "Transparency deadline completed."
        : "Annex IV transparency section (12) documented."
      : "Complete transparency disclosure or Annex IV Section 12.",
  });

  const raw = criteria.reduce((s, c) => s + c.earned, 0);
  const score = clampScore(raw);
  return {
    score,
    grade: getScoreGrade(score),
    criteria,
  };
}

export async function persistComplianceScore(systemId: string): Promise<number> {
  const { score } = await calculateComplianceScore(systemId);
  await db.aiSystem.update({
    where: { id: systemId },
    data: { complianceScore: score },
  });
  return score;
}
