import { ANNEX_IV_SECTIONS } from "@/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbState, dbMock } = vi.hoisted(() => {
  const dbState: { system: unknown } = { system: null };
  const dbMock = {
    aiSystem: {
      findUnique: vi.fn(async () => dbState.system),
      update: vi.fn(async () => ({})),
    },
  };
  return { dbState, dbMock };
});

vi.mock("@/server/db", () => ({ db: dbMock }));

import {
  calculateComplianceScore,
  getScoreColor,
  getScoreGrade,
  getScoreStyle,
  persistComplianceScore,
  SCORE_BREAKDOWN,
} from "@/lib/compliance-scoring";

const LONG = "x".repeat(80);

beforeEach(() => {
  vi.clearAllMocks();
  dbState.system = null;
});

function minimalSystem(override: Record<string, unknown> = {}) {
  return {
    id: "sys-1",
    riskTier: "unassessed",
    documents: [],
    conformityAssessments: [],
    incidents: [],
    complianceDeadlines: [],
    ...override,
  };
}

describe("getScoreGrade", () => {
  it("returns A for 90–100 inclusive", () => {
    expect(getScoreGrade(100)).toBe("A");
    expect(getScoreGrade(90)).toBe("A");
    expect(getScoreGrade(95)).toBe("A");
  });

  it("returns B for 75–89 inclusive", () => {
    expect(getScoreGrade(89)).toBe("B");
    expect(getScoreGrade(75)).toBe("B");
  });

  it("returns C for 60–74 inclusive", () => {
    expect(getScoreGrade(74)).toBe("C");
    expect(getScoreGrade(60)).toBe("C");
  });

  it("returns D for 40–59 inclusive", () => {
    expect(getScoreGrade(59)).toBe("D");
    expect(getScoreGrade(40)).toBe("D");
  });

  it("returns F below 40 and for 0", () => {
    expect(getScoreGrade(39)).toBe("F");
    expect(getScoreGrade(0)).toBe("F");
  });

  it("uses exclusive upper boundaries between bands", () => {
    expect(getScoreGrade(89)).toBe("B");
    expect(getScoreGrade(74)).toBe("C");
    expect(getScoreGrade(59)).toBe("D");
    expect(getScoreGrade(39)).toBe("F");
  });
});

describe("getScoreStyle & getScoreColor", () => {
  it("maps grades A–D to distinct palettes", () => {
    expect(getScoreStyle("A").text).toContain("emerald");
    expect(getScoreStyle("B").text).toContain("lime");
    expect(getScoreStyle("C").text).toContain("amber");
    expect(getScoreStyle("D").text).toContain("orange");
  });

  it("treats F and unknown labels as the default red style", () => {
    expect(getScoreStyle("F")).toEqual(getScoreStyle("Z"));
    expect(getScoreColor("Z")).toBe(getScoreColor("F"));
  });

  it("concatenates text, ring, and stroke classes", () => {
    const color = getScoreColor("A");
    expect(color).toContain("text-");
    expect(color).toContain("ring-");
    expect(color).toContain("stroke-");
  });
});

describe("calculateComplianceScore", () => {
  it("returns zeroed criteria when the system is missing", async () => {
    dbState.system = null;
    const res = await calculateComplianceScore("missing-id");
    expect(res.score).toBe(0);
    expect(res.grade).toBe("F");
    expect(res.criteria).toHaveLength(SCORE_BREAKDOWN.length);
    expect(res.criteria.every((c) => c.detail === "System not found")).toBe(true);
  });

  it("scores risk classification when tier is assessed", async () => {
    dbState.system = minimalSystem({ riskTier: "high" });
    const res = await calculateComplianceScore("sys-1");
    const risk = res.criteria.find((c) => c.id === "risk_classification");
    expect(risk?.earned).toBe(15);
    expect(risk?.detail).toContain("high");
  });

  it("counts Annex IV sections with substantive content", async () => {
    dbState.system = minimalSystem({
      documents: [
        { section: 1, content: LONG },
        { section: 1, content: LONG },
        { section: 0, content: LONG },
        { section: 1, content: "x".repeat(79) },
        { section: 2, content: null },
      ],
    });
    const res = await calculateComplianceScore("sys-1");
    const annex = res.criteria.find((c) => c.id === "annex_iv");
    expect(annex?.earned).toBe(20 + 5);
    const annexMax = 20 + 5 * ANNEX_IV_SECTIONS.length;
    expect(annex?.max).toBe(annexMax);
  });

  it("handles conformity assessment completed, in progress, and absent", async () => {
    dbState.system = minimalSystem({
      conformityAssessments: [{ status: "completed", completedAt: new Date() }],
    });
    let res = await calculateComplianceScore("sys-1");
    expect(res.criteria.find((c) => c.id === "conformity_assessment")?.earned).toBe(15);

    dbState.system = minimalSystem({
      conformityAssessments: [{ status: "draft", completedAt: null }],
    });
    res = await calculateComplianceScore("sys-1");
    expect(res.criteria.find((c) => c.id === "conformity_assessment")?.earned).toBe(10);

    dbState.system = minimalSystem({ conformityAssessments: [] });
    res = await calculateComplianceScore("sys-1");
    expect(res.criteria.find((c) => c.id === "conformity_assessment")?.earned).toBe(0);
  });

  it("treats completedAt without status completed as completed", async () => {
    dbState.system = minimalSystem({
      conformityAssessments: [{ status: "draft", completedAt: new Date() }],
    });
    const res = await calculateComplianceScore("sys-1");
    expect(res.criteria.find((c) => c.id === "conformity_assessment")?.earned).toBe(15);
  });

  it("detects incident response planning via calendar items", async () => {
    dbState.system = minimalSystem({
      complianceDeadlines: [
        {
          title: "Article 73 readiness",
          category: "general",
          status: "open",
          description: null,
        },
      ],
    });
    const res = await calculateComplianceScore("sys-1");
    expect(res.criteria.find((c) => c.id === "incident_response_plan")?.earned).toBe(10);
  });

  it("scores incidents including open status variants and critical penalty", async () => {
    dbState.system = minimalSystem({
      incidents: [{ status: "resolved", severity: "low" }],
    });
    let res = await calculateComplianceScore("sys-1");
    expect(res.criteria.find((c) => c.id === "incidents_resolved")?.earned).toBe(10);

    dbState.system = minimalSystem({
      incidents: [{ status: "investigating", severity: "medium" }],
    });
    res = await calculateComplianceScore("sys-1");
    expect(res.criteria.find((c) => c.id === "incidents_resolved")?.earned).toBe(0);

    dbState.system = minimalSystem({
      incidents: [{ status: "open", severity: "critical" }],
    });
    res = await calculateComplianceScore("sys-1");
    expect(res.criteria.find((c) => c.id === "incidents_resolved")?.earned).toBe(-5);
  });

  it("recognizes completed post-market monitoring deadlines", async () => {
    dbState.system = minimalSystem({
      complianceDeadlines: [
        {
          title: "Establish post-market monitoring",
          category: "general",
          status: "completed",
          description: null,
        },
      ],
    });
    const res = await calculateComplianceScore("sys-1");
    expect(res.criteria.find((c) => c.id === "post_market_monitoring")?.earned).toBe(10);
  });

  it("awards transparency via completed deadline or Annex IV section 12", async () => {
    dbState.system = minimalSystem({
      complianceDeadlines: [
        {
          title: "Disclosure",
          category: "transparency",
          status: "completed",
          description: null,
        },
      ],
    });
    let res = await calculateComplianceScore("sys-1");
    let t = res.criteria.find((c) => c.id === "transparency_disclosure");
    expect(t?.earned).toBe(10);
    expect(t?.detail).toContain("deadline");

    dbState.system = minimalSystem({
      documents: [{ section: 12, content: LONG }],
    });
    res = await calculateComplianceScore("sys-1");
    t = res.criteria.find((c) => c.id === "transparency_disclosure");
    expect(t?.earned).toBe(10);
    expect(t?.detail).toMatch(/\(12\)|Section 12/i);
  });

  it("clamps total score at 100 when raw points exceed the cap", async () => {
    dbState.system = minimalSystem({
      riskTier: "minimal",
      documents: ANNEX_IV_SECTIONS.map((s) => ({
        section: s.number,
        content: LONG,
      })),
      conformityAssessments: [{ status: "completed", completedAt: new Date() }],
      incidents: [],
      complianceDeadlines: [
        {
          title: "Incident response",
          category: "general",
          status: "completed",
          description: "incident response playbook",
        },
        {
          title: "Establish post-market monitoring",
          category: "general",
          status: "completed",
          description: null,
        },
        {
          title: "Transparency",
          category: "transparency",
          status: "completed",
          description: null,
        },
      ],
    });
    const res = await calculateComplianceScore("sys-1");
    expect(res.score).toBe(100);
    expect(res.grade).toBe("A");
  });
});

describe("persistComplianceScore", () => {
  it("writes the computed score to the database", async () => {
    dbState.system = minimalSystem({ riskTier: "high" });
    const score = await persistComplianceScore("sys-1");
    expect(score).toBeGreaterThan(0);
    expect(dbMock.aiSystem.update).toHaveBeenCalledWith({
      where: { id: "sys-1" },
      data: { complianceScore: score },
    });
  });
});
