export const dynamic = "force-dynamic";

import { db } from "@/server/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { getDaysUntilEnforcement } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RiskBadge } from "@/components/ui/badge";
import {
  Server,
  AlertTriangle,
  TrendingUp,
  Clock,
  Shield,
  FileText,
  ScrollText,
} from "lucide-react";
import Link from "next/link";
import { DashboardCharts } from "./charts";

async function getStats(orgId: string) {
  const systems = await db.aiSystem.findMany({
    where: { organizationId: orgId },
    select: { riskTier: true, complianceStatus: true, complianceScore: true },
  });

  const byRiskTier = { unacceptable: 0, high: 0, limited: 0, minimal: 0, unassessed: 0 };
  const byStatus = {
    compliant: 0,
    partially_compliant: 0,
    non_compliant: 0,
    under_review: 0,
    not_started: 0,
  };

  for (const s of systems) {
    const tier = s.riskTier as keyof typeof byRiskTier;
    if (tier in byRiskTier) byRiskTier[tier]++;
    const status = s.complianceStatus as keyof typeof byStatus;
    if (status in byStatus) byStatus[status]++;
  }

  const avgScore =
    systems.length > 0
      ? Math.round(
          systems.reduce((sum, s) => sum + s.complianceScore, 0) / systems.length
        )
      : 0;

  const recentLogs = await db.auditLog.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { aiSystem: { select: { name: true } } },
  });

  return {
    totalSystems: systems.length,
    highRiskCount: byRiskTier.high + byRiskTier.unacceptable,
    avgScore,
    byRiskTier,
    byStatus,
    recentLogs,
  };
}

export default async function DashboardPage() {
  const user = await getOrCreateDbUser();
  if (!user) return <SetupPrompt />;

  const stats = await getStats(user.organizationId);
  const daysRemaining = getDaysUntilEnforcement();

  const statCards = [
    {
      title: "Total AI Systems",
      value: stats.totalSystems,
      icon: Server,
      color: "text-primary",
      href: "/inventory",
    },
    {
      title: "High-Risk Systems",
      value: stats.highRiskCount,
      icon: AlertTriangle,
      color: "text-orange-400",
      href: "/classifier",
    },
    {
      title: "Avg. Compliance Score",
      value: `${stats.avgScore}%`,
      icon: TrendingUp,
      color: stats.avgScore >= 60 ? "text-green-400" : "text-red-400",
      href: "/inventory",
    },
    {
      title: "Days to Deadline",
      value: daysRemaining,
      icon: Clock,
      color: daysRemaining <= 90 ? "text-red-400" : "text-orange-400",
      href: "#",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Compliance Dashboard</h1>
        <p className="text-muted-foreground">
          EU AI Act compliance overview for your organization
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="transition-colors hover:border-primary/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {card.title}
                    </p>
                    <p className={`mt-1 text-3xl font-bold ${card.color}`}>
                      {card.value}
                    </p>
                  </div>
                  <card.icon className={`h-8 w-8 ${card.color} opacity-40`} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Charts */}
      <DashboardCharts
        riskData={stats.byRiskTier}
        statusData={stats.byStatus}
      />

      {/* Quick Actions + Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/inventory"
              className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent"
            >
              <Server className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Add AI System</p>
                <p className="text-xs text-muted-foreground">
                  Register a new system in your inventory
                </p>
              </div>
            </Link>
            <Link
              href="/classifier"
              className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent"
            >
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Classify Risk</p>
                <p className="text-xs text-muted-foreground">
                  Run AI-powered risk tier classification
                </p>
              </div>
            </Link>
            <Link
              href="/documents"
              className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent"
            >
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Generate Documentation</p>
                <p className="text-xs text-muted-foreground">
                  Create Annex IV technical documentation
                </p>
              </div>
            </Link>
            <Link
              href="/audit"
              className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent"
            >
              <ScrollText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">View Audit Trail</p>
                <p className="text-xs text-muted-foreground">
                  Review compliance activity history
                </p>
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No activity yet. Start by adding an AI system.
              </p>
            ) : (
              <div className="space-y-3">
                {stats.recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 text-sm"
                  >
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-foreground">
                        {log.details ?? `${log.action} ${log.resource}`}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        {log.aiSystem && (
                          <RiskBadge tier="default" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString("en-GB", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SetupPrompt() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md text-center">
        <CardContent className="p-8">
          <Shield className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-4 text-xl font-bold">Welcome to ComplianceForge</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Database connection required. Make sure DATABASE_URL is set and run
            prisma db push.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
