"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Server,
  GitBranch,
  Shield,
  FileText,
  ScrollText,
  Settings,
  LogOut,
  AlertTriangle,
  Clock,
  Calendar,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/server/actions";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "AI Inventory", href: "/inventory", icon: Server },
  { name: "GitHub Scanner", href: "/scanner", icon: GitBranch },
  { name: "Risk Classifier", href: "/classifier", icon: Shield },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Audit Trail", href: "/audit", icon: ScrollText },
  { name: "Incidents", href: "/incidents", icon: AlertTriangle },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Conformity", href: "/conformity", icon: ClipboardCheck },
  { name: "Settings", href: "/settings", icon: Settings },
];

function getDaysRemaining(): number {
  const enforcement = new Date("2026-08-02T00:00:00Z");
  const now = new Date();
  return Math.ceil(
    (enforcement.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const daysRemaining = getDaysRemaining();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <Shield className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">ComplianceForge</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href as Route}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Deadline Counter */}
      <div className="mx-3 mb-3 rounded-lg border border-orange-500/20 bg-orange-500/5 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-orange-400">
          <Clock className="h-4 w-4" />
          Enforcement Deadline
        </div>
        <div className="mt-1 text-2xl font-bold text-orange-400">
          {daysRemaining} days
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          August 2, 2026
        </div>
      </div>

      {/* Warning */}
      <div className="mx-3 mb-3 flex items-start gap-2 rounded-lg bg-red-500/5 p-3 text-xs text-red-400">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>Fines up to €35M or 7% of global annual turnover</span>
      </div>

      {/* User + Logout */}
      <div className="border-t border-border p-3">
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </form>
      </div>
    </aside>
  );
}
