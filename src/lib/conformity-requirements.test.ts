import { describe, expect, it } from "vitest";
import {
  CONFORMITY_CATEGORY_LABELS,
  CONFORMITY_REQUIREMENTS,
  buildInitialRequirementState,
  calculateCompletionPercentage,
  collectEvidenceUrls,
  mergeRequirementState,
  type ConformityCategory,
  type StoredConformityRequirement,
} from "./conformity-requirements";

const VALID_CATEGORIES = new Set<string>(
  Object.keys(CONFORMITY_CATEGORY_LABELS) as ConformityCategory[]
);

describe("CONFORMITY_REQUIREMENTS", () => {
  it("has the expected catalog size", () => {
    expect(CONFORMITY_REQUIREMENTS).toHaveLength(20);
  });

  it("defines every requirement with required fields", () => {
    for (const r of CONFORMITY_REQUIREMENTS) {
      expect(typeof r.id).toBe("string");
      expect(r.id.length).toBeGreaterThan(0);
      expect(typeof r.articleRef).toBe("string");
      expect(r.articleRef.length).toBeGreaterThan(0);
      expect(typeof r.title).toBe("string");
      expect(r.title.length).toBeGreaterThan(0);
      expect(typeof r.description).toBe("string");
      expect(r.description.length).toBeGreaterThan(0);
      expect(typeof r.category).toBe("string");
      expect(VALID_CATEGORIES.has(r.category)).toBe(true);
      expect(Array.isArray(r.evidenceRequired)).toBe(true);
      expect(r.evidenceRequired.length).toBeGreaterThan(0);
    }
  });

  it("uses only valid category values", () => {
    for (const r of CONFORMITY_REQUIREMENTS) {
      expect(VALID_CATEGORIES.has(r.category)).toBe(true);
    }
  });
});

describe("calculateCompletionPercentage", () => {
  it("returns 0 for an empty list", () => {
    expect(calculateCompletionPercentage([])).toBe(0);
  });

  it("returns 100 when every requirement is met", () => {
    const all = CONFORMITY_REQUIREMENTS.map(() => ({ met: true }));
    expect(calculateCompletionPercentage(all)).toBe(100);
  });

  it("rounds met share to a whole percent", () => {
    expect(calculateCompletionPercentage([{ met: true }, { met: false }])).toBe(50);
    expect(calculateCompletionPercentage([{ met: true }, { met: true }, { met: false }])).toBe(67);
  });
});

describe("buildInitialRequirementState", () => {
  it("creates one row per definition with met false", () => {
    const rows = buildInitialRequirementState();
    expect(rows).toHaveLength(CONFORMITY_REQUIREMENTS.length);
    expect(rows.every((r) => r.met === false)).toBe(true);
    expect(rows.map((r) => r.id)).toEqual(CONFORMITY_REQUIREMENTS.map((d) => d.id));
  });
});

describe("mergeRequirementState", () => {
  it("fills from stored values and defaults missing ids", () => {
    expect(mergeRequirementState(null)).toEqual(buildInitialRequirementState());
    expect(mergeRequirementState(undefined)).toEqual(buildInitialRequirementState());

    const stored: StoredConformityRequirement[] = [
      {
        id: "art8-1",
        met: true,
        evidenceUrl: " https://a.com ",
        notes: "ok",
      },
    ];
    const merged = mergeRequirementState(stored);
    const art8 = merged.find((r) => r.id === "art8-1");
    expect(art8?.met).toBe(true);
    expect(art8?.evidenceUrl).toBe(" https://a.com ");
    expect(art8?.notes).toBe("ok");
    expect(merged.find((r) => r.id === "art9-1")?.met).toBe(false);
  });
});

describe("collectEvidenceUrls", () => {
  it("trims, drops empty, and dedupes", () => {
    const reqs: StoredConformityRequirement[] = [
      { id: "a", met: false, evidenceUrl: " https://x.com ", notes: "" },
      { id: "b", met: false, evidenceUrl: "https://x.com", notes: "" },
      { id: "c", met: false, evidenceUrl: "", notes: "" },
    ];
    expect(collectEvidenceUrls(reqs)).toEqual(["https://x.com"]);
  });
});
