"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";

type Props = {
  stripeConfigured: boolean;
  isFreePlan: boolean;
  hasStripeCustomer: boolean;
};

export function BillingActions({
  stripeConfigured,
  isFreePlan,
  hasStripeCustomer,
}: Props) {
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setError(null);
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not open billing portal");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Could not open billing portal");
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      {hasStripeCustomer && (
        <Button
          variant="outline"
          className="w-full"
          disabled={!stripeConfigured || portalLoading}
          onClick={() => void openPortal()}
        >
          {portalLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          Manage Billing
        </Button>
      )}
      {isFreePlan && (
        <Button
          className="w-full"
          disabled={!stripeConfigured}
          asChild={stripeConfigured}
        >
          {stripeConfigured ? (
            <Link href={"/api/stripe/checkout?plan=starter" as Route}>
              Upgrade
            </Link>
          ) : (
            <span>Upgrade</span>
          )}
        </Button>
      )}
      {!stripeConfigured && (
        <p className="text-xs text-muted-foreground">
          Stripe is not configured (missing STRIPE_SECRET_KEY). Billing actions
          are disabled.
        </p>
      )}
    </div>
  );
}
