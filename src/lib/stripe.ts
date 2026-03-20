import Stripe from "stripe";

/** Practical cap for “unlimited” enterprise tier (fits PostgreSQL int). */
const ENTERPRISE_MAX_SYSTEMS = 1_000_000;

export type BillingPlan = "free" | "starter" | "growth" | "enterprise";

export type PaidPlan = Exclude<BillingPlan, "free">;

const PAID_PLANS: PaidPlan[] = ["starter", "growth", "enterprise"];

export function isPaidPlan(plan: string): plan is PaidPlan {
  return PAID_PLANS.includes(plan as PaidPlan);
}

function priceIdFromEnv(plan: PaidPlan): string {
  const key =
    plan === "starter"
      ? process.env.STRIPE_PRICE_STARTER
      : plan === "growth"
        ? process.env.STRIPE_PRICE_GROWTH
        : process.env.STRIPE_PRICE_ENTERPRISE;
  return (key ?? "").trim();
}

export type PlanConfig = {
  displayName: string;
  monthlyEur: number | null;
  maxSystems: number;
  /** Stripe Price ID; empty until env is set */
  priceId: string;
  features: string[];
};

function buildPlanConfig(): Record<BillingPlan, PlanConfig> {
  return {
    free: {
      displayName: "Free",
      monthlyEur: 0,
      maxSystems: 3,
      priceId: "",
      features: [
        "Risk classification",
        "Basic inventory",
        "Community support",
      ],
    },
    starter: {
      displayName: "Starter",
      monthlyEur: 99,
      maxSystems: 15,
      priceId: priceIdFromEnv("starter"),
      features: [
        "Everything in Free",
        "Document generator",
        "Audit trail",
        "Email support",
      ],
    },
    growth: {
      displayName: "Growth",
      monthlyEur: 299,
      maxSystems: 100,
      priceId: priceIdFromEnv("growth"),
      features: [
        "Everything in Starter",
        "GitHub scanner",
        "Conformity assessment",
        "Compliance calendar",
        "API access",
      ],
    },
    enterprise: {
      displayName: "Enterprise",
      monthlyEur: 999,
      maxSystems: ENTERPRISE_MAX_SYSTEMS,
      priceId: priceIdFromEnv("enterprise"),
      features: [
        "Everything in Growth",
        "SSO (SAML/OIDC)",
        "Multi-tenant",
        "Custom integrations",
        "Dedicated support",
        "SLA guarantee",
      ],
    },
  };
}

/** Snapshot of plan catalog; price IDs reflect env at module load (API routes use Node runtime). */
export const PLAN_CONFIG: Record<BillingPlan, PlanConfig> = buildPlanConfig();

/** Max Annex IV (or other) document generations per org per calendar month on Free. */
export const FREE_PLAN_MONTHLY_DOCUMENT_LIMIT = 5;

let stripeSingleton: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (stripeSingleton === undefined) {
    stripeSingleton = new Stripe(key, { typescript: true });
  }
  return stripeSingleton;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function resolvePriceIdForPlan(plan: PaidPlan): string | null {
  const id = priceIdFromEnv(plan);
  return id || null;
}

export function getPlanLimits(plan: BillingPlan): { maxSystems: number } {
  return { maxSystems: PLAN_CONFIG[plan].maxSystems };
}

export function getPlanFeatures(plan: BillingPlan): string[] {
  return [...PLAN_CONFIG[plan].features];
}

export function planFromStripePriceId(priceId: string): BillingPlan | null {
  for (const p of PAID_PLANS) {
    const id = priceIdFromEnv(p);
    if (id && id === priceId) return p;
  }
  return null;
}

export function normalizeOrgPlan(raw: string | null | undefined): BillingPlan {
  if (raw && (["free", "starter", "growth", "enterprise"] as const).includes(raw as BillingPlan)) {
    return raw as BillingPlan;
  }
  return "free";
}
