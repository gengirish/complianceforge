export const dynamic = "force-dynamic";

import { getAuthUser } from "@/lib/auth";
import { getDaysUntilEnforcement } from "@/lib/utils";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const user = await getAuthUser();
  const daysRemaining = getDaysUntilEnforcement();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account, organization, and compliance preferences
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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
              <span className="text-muted-foreground">Plan</span>
              <Badge>Free</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">AI System Limit</span>
              <span>3 / 3</span>
            </div>
            <Button variant="outline" className="w-full" disabled>
              <CreditCard className="h-4 w-4" />
              Upgrade Plan (Coming Soon)
            </Button>
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
