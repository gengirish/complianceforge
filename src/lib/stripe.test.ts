import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const StripeCtor = vi.hoisted(() =>
  vi.fn().mockImplementation(function MockStripe() {
    return { __brand: "stripe-mock" };
  })
);

vi.mock("stripe", () => ({
  default: StripeCtor,
}));

import type { BillingPlan } from "./stripe";

const ALL_PLANS: BillingPlan[] = ["free", "starter", "growth", "enterprise"];

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("PLAN_CONFIG & getPlanLimits", () => {
  let stripe: typeof import("./stripe");

  beforeEach(async () => {
    vi.resetModules();
    stripe = await import("./stripe");
  });

  it("defines every billing plan", () => {
    for (const plan of ALL_PLANS) {
      expect(stripe.PLAN_CONFIG[plan]).toBeDefined();
      expect(stripe.PLAN_CONFIG[plan].displayName.length).toBeGreaterThan(0);
      expect(stripe.PLAN_CONFIG[plan].maxSystems).toBeGreaterThan(0);
      expect(Array.isArray(stripe.PLAN_CONFIG[plan].features)).toBe(true);
    }
  });

  it("returns configured maxSystems per plan", () => {
    expect(stripe.getPlanLimits("free")).toEqual({ maxSystems: 3 });
    expect(stripe.getPlanLimits("starter")).toEqual({ maxSystems: 15 });
    expect(stripe.getPlanLimits("growth")).toEqual({ maxSystems: 100 });
    expect(stripe.getPlanLimits("enterprise")).toEqual({ maxSystems: 1_000_000 });
  });

  it("caps free tier at three systems", () => {
    expect(stripe.PLAN_CONFIG.free.maxSystems).toBe(3);
  });

  it("gives enterprise a very high system cap", () => {
    expect(stripe.PLAN_CONFIG.enterprise.maxSystems).toBe(1_000_000);
    expect(stripe.PLAN_CONFIG.enterprise.maxSystems).toBeGreaterThan(
      stripe.PLAN_CONFIG.growth.maxSystems
    );
  });
});

describe("plan helpers", () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it("classifies paid vs free plans", async () => {
    const { isPaidPlan } = await import("./stripe");
    expect(isPaidPlan("free")).toBe(false);
    expect(isPaidPlan("starter")).toBe(true);
    expect(isPaidPlan("enterprise")).toBe(true);
    expect(isPaidPlan("unknown")).toBe(false);
  });

  it("reads Stripe price IDs from the environment", async () => {
    vi.stubEnv("STRIPE_PRICE_STARTER", "price_starter_x");
    vi.stubEnv("STRIPE_PRICE_GROWTH", "price_growth_x");
    vi.stubEnv("STRIPE_PRICE_ENTERPRISE", "price_ent_x");
    const m = await import("./stripe");
    expect(m.resolvePriceIdForPlan("starter")).toBe("price_starter_x");
    expect(m.resolvePriceIdForPlan("growth")).toBe("price_growth_x");
    expect(m.planFromStripePriceId("price_growth_x")).toBe("growth");
    expect(m.planFromStripePriceId("nope")).toBeNull();
  });

  it("returns null when a paid plan price id is unset", async () => {
    vi.stubEnv("STRIPE_PRICE_STARTER", "");
    const { resolvePriceIdForPlan } = await import("./stripe");
    expect(resolvePriceIdForPlan("starter")).toBeNull();
  });

  it("copies feature lists for consumers", async () => {
    const { getPlanFeatures, PLAN_CONFIG } = await import("./stripe");
    const f = getPlanFeatures("free");
    expect(f).toEqual(PLAN_CONFIG.free.features);
    f.push("mutated");
    expect(PLAN_CONFIG.free.features.includes("mutated")).toBe(false);
  });

  it("normalizes organization plan strings", async () => {
    const { normalizeOrgPlan } = await import("./stripe");
    expect(normalizeOrgPlan("growth")).toBe("growth");
    expect(normalizeOrgPlan(null)).toBe("free");
    expect(normalizeOrgPlan("invalid")).toBe("free");
  });
});

describe("Stripe client factory", () => {
  beforeEach(async () => {
    vi.resetModules();
    StripeCtor.mockClear();
  });

  it("returns null when the secret key is missing", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    const { getStripe, isStripeConfigured } = await import("./stripe");
    expect(getStripe()).toBeNull();
    expect(isStripeConfigured()).toBe(false);
  });

  it("constructs a singleton client when configured", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", " sk_live_test ");
    const { getStripe, isStripeConfigured } = await import("./stripe");
    expect(isStripeConfigured()).toBe(true);
    const a = getStripe();
    const b = getStripe();
    expect(a).toBe(b);
    expect(StripeCtor).toHaveBeenCalledTimes(1);
    expect(StripeCtor).toHaveBeenCalledWith("sk_live_test", { typescript: true });
  });
});
