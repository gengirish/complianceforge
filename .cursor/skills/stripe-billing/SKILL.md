---
name: stripe-billing
description: >-
  Integrate Stripe subscription billing including checkout, webhooks, plan enforcement, and customer portal.
  Use when working with payments, pricing tiers, usage limits, or plan upgrades in ComplianceForge.
---

# ComplianceForge Stripe Billing

Adapted from the interviewbot-billing skill for EU AI Act compliance SaaS.

## Subscription Plans

| Plan | Price | Systems | Features |
|------|-------|---------|----------|
| Free | €0 | 3 | Mock classification, 5 docs/month |
| Starter | €99/mo | 15 | Claude classification, unlimited docs, email notifications |
| Growth | €299/mo | 100 | API access, team RBAC, priority support |
| Enterprise | €999/mo | Unlimited | SSO, custom branding, dedicated support |

## Architecture

```
src/lib/stripe.ts          → Client singleton, PLAN_CONFIG, helpers
src/app/api/stripe/
  checkout/route.ts        → POST: create Checkout Session
  webhook/route.ts         → POST: handle Stripe events
  portal/route.ts          → POST: create Customer Portal session
src/server/actions.ts      → checkPlanLimit(), plan enforcement in actions
src/app/(dashboard)/settings/
  page.tsx                 → Billing section with current plan + upgrade
  billing-actions.tsx      → Client-side billing buttons
```

## Payment Flow

```
1. User clicks "Upgrade" → POST /api/stripe/checkout?plan=starter
2. Server creates Stripe Checkout Session with metadata: {orgId, plan}
3. User completes payment on Stripe-hosted page
4. Stripe webhook: checkout.session.completed
5. Backend updates Organization: plan, maxSystems, stripeCustomerId, stripeSubscriptionId
6. Monthly renewal: invoice.paid → no action needed (subscription continues)
7. Cancel: customer.subscription.deleted → downgrade to free, maxSystems=3
```

## Plan Enforcement

```typescript
// Before creating a system:
const count = await db.aiSystem.count({ where: { organizationId } });
if (count >= org.maxSystems) {
  throw new Error(`System limit reached (${count}/${org.maxSystems}). Please upgrade.`);
}

// Before Claude classification:
if (normalizeOrgPlan(org.plan) === "free") {
  // Use mock classifier only
}

// Before document generation:
if (normalizeOrgPlan(org.plan) === "free" && monthlyDocs >= 5) {
  throw new Error("Monthly document generation limit reached. Please upgrade.");
}
```

## Key Rules

1. Stripe amounts are in cents -- EUR multiply by 100
2. Always verify webhook signatures
3. Never expose STRIPE_SECRET_KEY -- only publishable key is public
4. Check plan limits before expensive operations (classification, document generation)
5. Use Stripe Customer Portal for self-service billing management
6. Free tier has no credit card requirement
7. Plan tiers control feature access (mock vs Claude, doc limits)
8. maxSystems field on Organization enforces system count limits
