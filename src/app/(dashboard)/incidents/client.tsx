"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  createIncidentAction,
  markReportedToNcaAction,
  updateIncidentStatusAction,
} from "@/server/actions";
import { cn } from "@/lib/utils";

const NCA_REPORT_DAYS = 15;

type FilterTab = "all" | "open" | "investigating" | "resolved";

interface SystemOption {
  id: string;
  name: string;
}

interface SerializedIncident {
  id: string;
  aiSystemId: string;
  reporterId: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  reportedToNca: boolean;
  ncaReportDate: string | null;
  rootCause: string | null;
  remediation: string | null;
  occurredAt: string;
  detectedAt: string;
  createdAt: string;
  updatedAt: string;
  aiSystem: {
    id: string;
    name: string;
  };
  reporter: {
    id: string;
    email: string;
    name: string | null;
  };
}

function severityBadgeClass(severity: string) {
  switch (severity.toLowerCase()) {
    case "critical":
      return "border-transparent bg-red-500/15 text-red-400";
    case "high":
      return "border-transparent bg-orange-500/15 text-orange-400";
    case "medium":
      return "border-transparent bg-yellow-500/15 text-yellow-400";
    case "low":
      return "border-transparent bg-green-500/15 text-green-400";
    default:
      return "border-transparent bg-muted text-muted-foreground";
  }
}

function statusBadgeClass(status: string) {
  switch (status.toLowerCase()) {
    case "open":
      return "border-transparent bg-blue-500/15 text-blue-400";
    case "investigating":
      return "border-transparent bg-amber-500/15 text-amber-400";
    case "resolved":
      return "border-transparent bg-green-500/15 text-green-400";
    case "closed":
      return "border-transparent bg-muted text-muted-foreground";
    default:
      return "border-transparent bg-muted text-muted-foreground";
  }
}

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ncaDeadlineInfo(detectedAtIso: string, reportedToNca: boolean) {
  const detected = new Date(detectedAtIso);
  const deadline = new Date(detected);
  deadline.setDate(deadline.getDate() + NCA_REPORT_DAYS);
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / msPerDay);
  const overdue = !reportedToNca && daysRemaining < 0;
  return { daysRemaining, overdue };
}

export function IncidentsClient({
  incidents,
  systems,
}: {
  incidents: SerializedIncident[];
  systems: SystemOption[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (filter === "all") return incidents;
    if (filter === "open") return incidents.filter((i) => i.status === "open");
    if (filter === "investigating") {
      return incidents.filter((i) => i.status === "investigating");
    }
    return incidents.filter(
      (i) => i.status === "resolved" || i.status === "closed"
    );
  }, [incidents, filter]);

  function handleStatusChange(incidentId: string, status: string) {
    startTransition(() => updateIncidentStatusAction(incidentId, status));
  }

  function handleMarkNca(incidentId: string) {
    startTransition(() => markReportedToNcaAction(incidentId));
  }

  const tabBtn = (key: FilterTab, label: string) => (
    <Button
      type="button"
      variant={filter === key ? "default" : "outline"}
      size="sm"
      onClick={() => setFilter(key)}
      className={cn(filter !== key && "border-border bg-transparent")}
    >
      {label}
    </Button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Incidents</h1>
          <p className="text-muted-foreground">
            {incidents.length} incident{incidents.length !== 1 ? "s" : ""}{" "}
            recorded · Article 62 NCA reporting ({NCA_REPORT_DAYS}-day window from
            detection)
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Report Incident
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabBtn("all", "All")}
        {tabBtn("open", "Open")}
        {tabBtn("investigating", "Investigating")}
        {tabBtn("resolved", "Resolved")}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Report new incident</CardTitle>
            <CardDescription>
              Document a serious incident for compliance tracking and NCA
              notification where required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {systems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Register an AI system in Inventory before reporting an incident.
              </p>
            ) : (
              <form
                action={(formData) => {
                  startTransition(async () => {
                    await createIncidentAction(formData);
                    setShowForm(false);
                  });
                }}
                className="grid gap-4 sm:grid-cols-2"
              >
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium">Title *</label>
                  <Input
                    name="title"
                    placeholder="Short summary of the incident"
                    required
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium">Description *</label>
                  <Textarea
                    name="description"
                    placeholder="What happened, impact, and context..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">AI system *</label>
                  <select
                    name="aiSystemId"
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Select system...</option>
                    {systems.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Severity *</label>
                  <select
                    name="severity"
                    required
                    defaultValue="medium"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Occurred at *</label>
                  <Input
                    name="occurredAt"
                    type="datetime-local"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Detected at *</label>
                  <Input
                    name="detectedAt"
                    type="datetime-local"
                    required
                  />
                </div>
                <div className="flex gap-2 sm:col-span-2">
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Submitting..." : "Submit report"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No incidents</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {incidents.length === 0
                ? "Report an incident when a serious event affects your AI systems."
                : "No incidents match this filter."}
            </p>
            {incidents.length === 0 && systems.length > 0 && (
              <Button className="mt-4" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" />
                Report Incident
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">AI System</th>
                <th className="px-4 py-3 text-left font-medium">Severity</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">NCA Deadline</th>
                <th className="px-4 py-3 text-left font-medium">Reported</th>
                <th className="px-4 py-3 text-right font-medium w-[280px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((incident) => {
                const { daysRemaining, overdue } = ncaDeadlineInfo(
                  incident.detectedAt,
                  incident.reportedToNca
                );
                return (
                  <tr
                    key={incident.id}
                    className={cn(
                      "border-b border-border transition-colors hover:bg-muted/30",
                      overdue && "bg-red-500/5"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{incident.title}</p>
                        {overdue && (
                          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-red-400">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            NCA window exceeded — report required
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {incident.aiSystem.name}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={cn(
                          "border font-semibold capitalize",
                          severityBadgeClass(incident.severity)
                        )}
                      >
                        {incident.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={cn(
                          "border font-semibold",
                          statusBadgeClass(incident.status)
                        )}
                      >
                        {formatStatusLabel(incident.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {incident.reportedToNca ? (
                        <span className="text-xs text-muted-foreground">
                          Reported to NCA
                        </span>
                      ) : daysRemaining < 0 ? (
                        <Badge className="border border-red-500/30 bg-red-500/15 text-red-400">
                          Overdue ({Math.abs(daysRemaining)}d)
                        </Badge>
                      ) : daysRemaining === 0 ? (
                        <Badge className="border border-orange-500/30 bg-orange-500/15 text-orange-400">
                          Due today
                        </Badge>
                      ) : (
                        <span
                          className={cn(
                            "font-medium",
                            daysRemaining <= 3
                              ? "text-orange-400"
                              : "text-foreground"
                          )}
                        >
                          {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}{" "}
                          left
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {incident.reportedToNca ? (
                        <Badge
                          className={cn(
                            "border-transparent bg-green-500/15 text-green-400"
                          )}
                        >
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          No
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">
                        <select
                          value={incident.status}
                          onChange={(e) =>
                            handleStatusChange(incident.id, e.target.value)
                          }
                          disabled={isPending}
                          className="flex h-9 w-full max-w-[160px] rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          aria-label="Update incident status"
                        >
                          <option value="open">Open</option>
                          <option value="investigating">Investigating</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={incident.reportedToNca || isPending}
                          onClick={() => handleMarkNca(incident.id)}
                          className="border-border shrink-0"
                        >
                          Mark Reported to NCA
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
