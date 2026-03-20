import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/auth";
import { db } from "@/server/db";
import { env } from "@/lib/env";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured. Set STRIPE_SECRET_KEY in your environment." },
      { status: 503 }
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured. Set STRIPE_SECRET_KEY in your environment." },
      { status: 503 }
    );
  }

  const user = await getOrCreateDbUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const org = await db.organization.findUnique({
    where: { id: user.organizationId },
  });
  if (!org?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No billing account on file. Subscribe to a paid plan first." },
      { status: 400 }
    );
  }

  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${base}/settings`,
  });

  return NextResponse.json({ url: session.url });
}
