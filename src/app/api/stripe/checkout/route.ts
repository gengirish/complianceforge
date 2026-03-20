import { NextRequest, NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/auth";
import { db } from "@/server/db";
import { env } from "@/lib/env";
import {
  getStripe,
  isPaidPlan,
  isStripeConfigured,
  resolvePriceIdForPlan,
  type PaidPlan,
} from "@/lib/stripe";

export const runtime = "nodejs";

async function createCheckoutSession(plan: PaidPlan) {
  if (!isStripeConfigured()) {
    return {
      error: "Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.",
      url: null as string | null,
    };
  }

  const stripe = getStripe();
  if (!stripe) {
    return {
      error: "Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.",
      url: null as string | null,
    };
  }

  const user = await getOrCreateDbUser();
  if (!user) {
    return { error: "Not authenticated", url: null as string | null };
  }

  const priceId = resolvePriceIdForPlan(plan);
  if (!priceId) {
    return {
      error: `No Stripe price ID configured for plan "${plan}". Set the matching STRIPE_PRICE_* env var.`,
      url: null as string | null,
    };
  }

  const org = await db.organization.findUnique({
    where: { id: user.organizationId },
  });
  if (!org) {
    return { error: "Organization not found", url: null as string | null };
  }

  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { orgId: org.id },
    });
    customerId = customer.id;
    await db.organization.update({
      where: { id: org.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/settings?billing=success`,
    cancel_url: `${base}/settings?billing=cancelled`,
    metadata: { orgId: org.id, plan },
    subscription_data: {
      metadata: { orgId: org.id, plan },
    },
  });

  if (!session.url) {
    return { error: "Checkout session did not return a URL", url: null as string | null };
  }

  return { error: null as string | null, url: session.url };
}

/** Browser-friendly: follow link with ?plan=starter → redirect to Stripe Checkout. */
export async function GET(req: NextRequest) {
  const plan = req.nextUrl.searchParams.get("plan") ?? "";
  if (!isPaidPlan(plan)) {
    return NextResponse.json(
      { error: `Invalid or missing plan. Use one of: starter, growth, enterprise.` },
      { status: 400 }
    );
  }

  const { error, url } = await createCheckoutSession(plan);
  if (error || !url) {
    const status = error === "Not authenticated" ? 401 : 503;
    return NextResponse.json({ error: error ?? "Checkout failed" }, { status });
  }

  return NextResponse.redirect(url, 303);
}

export async function POST(req: NextRequest) {
  let plan: string | undefined;
  try {
    const body = (await req.json()) as { plan?: string };
    plan = body.plan;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!plan || !isPaidPlan(plan)) {
    return NextResponse.json(
      { error: `Invalid plan. Expected one of: starter, growth, enterprise.` },
      { status: 400 }
    );
  }

  const { error, url } = await createCheckoutSession(plan);
  if (error || !url) {
    const status =
      error === "Not authenticated"
        ? 401
        : !isStripeConfigured() || error?.includes("Stripe is not configured")
          ? 503
          : 400;
    return NextResponse.json({ error: error ?? "Checkout failed" }, { status });
  }

  return NextResponse.json({ url });
}
