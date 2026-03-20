export const dynamic = "force-dynamic";

import { db } from "@/server/db";
import { getOrCreateDbUser } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollText, Shield, FileText, Server, Trash2, Eye } from "lucide-react";

const ACTION_ICONS: Record<string, typeof Shield> = {
  create: Server,
  update: FileText,
  delete: Trash2,
  classify: Shield,
  generate: FileText,
  view: Eye,
};

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-500",
  update: "bg-blue-500",
  delete: "bg-red-500",
  classify: "bg-orange-500",
  generate: "bg-purple-500",
  view: "bg-gray-500",
};

export default async function AuditPage() {
  const user = await getOrCreateDbUser();
  if (!user) return null;

  const logs = await db.auditLog.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { name: true, email: true } },
      aiSystem: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Trail</h1>
        <p className="text-muted-foreground">
          Immutable compliance activity log per Article 12 — 10-year retention
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity Log</CardTitle>
          <CardDescription>
            {logs.length} entries — All actions are recorded with tamper-evident
            timestamps
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="py-16 text-center">
              <ScrollText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No Activity Yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Actions like creating systems, classifying risk, and generating
                documents will appear here.
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute bottom-0 left-[19px] top-0 w-px bg-border" />

              <div className="space-y-4">
                {logs.map((log, i) => {
                  const Icon = ACTION_ICONS[log.action] ?? ScrollText;
                  const dotColor = ACTION_COLORS[log.action] ?? "bg-gray-500";
                  const prevDate = i > 0 ? logs[i - 1]!.createdAt : null;
                  const showDate =
                    !prevDate ||
                    new Date(log.createdAt).toDateString() !==
                      new Date(prevDate).toDateString();

                  return (
                    <div key={log.id}>
                      {showDate && (
                        <div className="relative mb-4 ml-10 mt-2">
                          <p className="text-xs font-semibold uppercase text-muted-foreground">
                            {new Date(log.createdAt).toLocaleDateString(
                              "en-GB",
                              {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              }
                            )}
                          </p>
                        </div>
                      )}
                      <div className="relative flex items-start gap-4">
                        <div
                          className={`relative z-10 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card`}
                        >
                          <div
                            className={`absolute -left-0 -top-0 h-2.5 w-2.5 rounded-full ${dotColor}`}
                            style={{ left: -1, top: -1 }}
                          />
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1 pb-2">
                          <p className="text-sm">
                            {log.details ??
                              `${log.action} ${log.resource}`}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {log.action}
                            </Badge>
                            {log.aiSystem && (
                              <span className="text-xs text-muted-foreground">
                                {log.aiSystem.name}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.createdAt).toLocaleTimeString(
                                "en-GB",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                }
                              )}
                            </span>
                            {log.user && (
                              <span className="text-xs text-muted-foreground">
                                by {log.user.name ?? log.user.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
