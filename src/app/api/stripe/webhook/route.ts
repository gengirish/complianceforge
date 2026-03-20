import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/server/db";
import {
  getPlanLimits,
  getStripe,
  isStripeConfigured,
  planFromStripePriceId,
  type BillingPlan,
} from "@/lib/stripe";

export const runtime = "nodejs";

const FREE_PLAN: BillingPlan = "free";

async function applyOrgSubscriptionState(params: {
  orgId: string;
  customerId: string;
  subscriptionId: string | null;
  plan: BillingPlan;
}) {
  const { maxSystems } = getPlanLimits(params.plan);
  await db.organization.update({
    where: { id: params.orgId },
    data: {
      plan: params.plan,
      maxSystems,
      stripeCustomerId: params.customerId,
      stripeSubscriptionId: params.subscriptionId,
    },
  });
}

async function downgradeOrgToFree(customerId: string) {
  const org = await db.organization.findFirst({
    where: { stripeCustomerId: customerId },
  });
  if (!org) return;

  const { maxSystems } = getPlanLimits(FREE_PLAN);
  await db.organization.update({
    where: { id: org.id },
    data: {
      plan: FREE_PLAN,
      maxSystems,
      stripeSubscriptionId: null,
    },
  });
}

function primaryPriceId(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0];
  const price = item?.price;
  if (!price) return null;
  return typeof price === "string" ? price : price.id;
}

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured (missing STRIPE_WEBHOOK_SECRET)" },
      { status: 503 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const orgId = session.metadata?.orgId;
        const planMeta = session.metadata?.plan as BillingPlan | undefined;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (!orgId || !customerId || !subscriptionId) break;

        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = primaryPriceId(sub);
        const planFromPrice = priceId ? planFromStripePriceId(priceId) : null;
        const plan =
          (planFromPrice ?? (planMeta && planMeta !== "free" ? planMeta : null)) as
            | BillingPlan
            | null;

        if (!plan || plan === FREE_PLAN) break;

        await applyOrgSubscriptionState({
          orgId,
          customerId,
          subscriptionId,
          plan,
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        const orgIdMeta = subscription.metadata?.orgId;
        const org = orgIdMeta
          ? await db.organization.findUnique({ where: { id: orgIdMeta } })
          : await db.organization.findFirst({
              where: { stripeSubscriptionId: subscription.id },
            });

        if (!org) break;

        const status = subscription.status;
        if (status === "active" || status === "trialing") {
          const priceId = primaryPriceId(subscription);
          const plan = priceId ? planFromStripePriceId(priceId) : null;
          if (!plan) break;

          await applyOrgSubscriptionState({
            orgId: org.id,
            customerId,
            subscriptionId: subscription.id,
            plan,
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        await downgradeOrgToFree(customerId);
        break;
      }

      default:
        break;
    }
  } catch (e) {
    console.error("[stripe webhook]", e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
