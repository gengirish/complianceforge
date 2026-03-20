export const dynamic = "force-dynamic";

import Link from "next/link";
import type { Route } from "next";
import { getAuthUser, getOrCreateDbUser } from "@/lib/auth";
import { db } from "@/server/db";
import { getDaysUntilEnforcement } from "@/lib/utils";
import {
  normalizeOrgPlan,
  PLAN_CONFIG,
  isStripeConfigured,
} from "@/lib/stripe";
import { BillingActions } from "./billing-actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Building2,
  CreditCard,
  Bell,
  Shield,
  Globe,
  Key,
  Plug,
  Users,
} from "lucide-react";

export default async function SettingsPage() {
  const user = await getAuthUser();
  const dbUser = await getOrCreateDbUser();
  const daysRemaining = getDaysUntilEnforcement();

  const org = dbUser
    ? await db.organization.findUnique({
        where: { id: dbUser.organizationId },
        include: { _count: { select: { aiSystems: true } } },
      })
    : null;

  const billingPlan = normalizeOrgPlan(org?.plan);
  const planMeta = PLAN_CONFIG[billingPlan];
  const systemCount = org?._count.aiSystems ?? 0;
  const maxSystems = org?.maxSystems ?? planMeta.maxSystems;
  const stripeOk = isStripeConfigured();
  const limitLabel =
    billingPlan === "enterprise" ? "Unlimited" : String(maxSystems);
  const usageLabel =
    billingPlan === "enterprise"
      ? `${systemCount} systems`
      : `${systemCount} / ${maxSystems}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account, organization, and compliance preferences
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Team */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Team</CardTitle>
            </div>
            <CardDescription>
              Invitations, roles, and organization access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={"/settings/team" as Route}
              className="text-sm font-medium text-primary hover:underline"
            >
              Manage team →
            </Link>
          </CardContent>
        </Card>

        {/* Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Profile</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{user?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user?.email ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <Badge variant="secondary">
                {user?.role ?? "admin"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Organization */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Organization</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{org?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Domain</span>
              <span className="font-medium">{org?.domain ?? "—"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Billing */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Billing</CardTitle>
            </div>
            <CardDescription>
              Plan limits and Stripe Customer Portal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current plan</span>
              <Badge variant={billingPlan === "free" ? "secondary" : "default"}>
                {planMeta.displayName}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">AI system limit</span>
              <span title={limitLabel}>{usageLabel}</span>
            </div>
            <BillingActions
              stripeConfigured={stripeOk}
              isFreePlan={billingPlan === "free"}
              hasStripeCustomer={Boolean(org?.stripeCustomerId)}
            />
          </CardContent>
        </Card>

        {/* Compliance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Compliance Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">EU AI Act Deadline</span>
              <span className="font-medium text-orange-400">
                {daysRemaining} days
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Enforcement Date</span>
              <span>August 2, 2026</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Regulation</span>
              <span>EU AI Act (Regulation 2024/1689)</span>
            </div>
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Integrations</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <Plug className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">REST API</span>
              </div>
              <Link
                href={"/settings/api" as Route}
                className="text-sm font-medium text-primary hover:underline"
              >
                API keys
              </Link>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Claude AI (Anthropic)</span>
              </div>
              <Badge
                variant={
                  process.env.ANTHROPIC_API_KEY ? "default" : "secondary"
                }
              >
                {process.env.ANTHROPIC_API_KEY ? "Connected" : "Demo Mode"}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">AgentMail (Email)</span>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">GitHub Scanner</span>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
