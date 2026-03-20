"use client";

import { useMemo, useState, useTransition } from "react";
import { Calendar as CalendarIcon, Plus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  completeDeadlineAction,
  createDeadlineAction,
} from "@/server/actions";
import { cn } from "@/lib/utils";

export type SerializedDeadline = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  status: string;
  priority: string;
  category: string;
  aiSystemId: string | null;
  assigneeId: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  aiSystem: { id: string; name: string } | null;
  assignee: { id: string; email: string; name: string | null } | null;
};

type FilterTab = "all" | "overdue" | "upcoming" | "completed";

const CATEGORY_OPTIONS = [
  { value: "general", label: "General" },
  { value: "documentation", label: "Documentation" },
  { value: "assessment", label: "Assessment" },
  { value: "registration", label: "Registration" },
  { value: "risk_management", label: "Risk management" },
  { value: "transparency", label: "Transparency" },
  { value: "enforcement", label: "Enforcement" },
] as const;

function daysRelativeToDue(dueIso: string): number {
  const due = new Date(dueIso).getTime();
  const now = Date.now();
  return Math.ceil((due - now) / (86_400_000));
}

function isOverdue(d: SerializedDeadline): boolean {
  return d.status === "pending" && daysRelativeToDue(d.dueDate) < 0;
}

function isUpcomingWindow(d: SerializedDeadline): boolean {
  if (d.status !== "pending") return false;
  const days = daysRelativeToDue(d.dueDate);
  return days >= 0 && days <= 30;
}

function priorityBadgeClass(priority: string): string {
  const p = priority.toLowerCase();
  if (p === "high" || p === "critical") {
    return "border-orange-500/30 bg-orange-500/15 text-orange-400";
  }
  if (p === "low") {
    return "border-muted-foreground/30 bg-muted text-muted-foreground";
  }
  return "border-yellow-500/30 bg-yellow-500/15 text-yellow-400";
}

function CountdownBadge({ deadline }: { deadline: SerializedDeadline }) {
  if (deadline.status === "completed") {
    return (
      <Badge className="border-green-500/30 bg-green-500/15 text-green-400">
        Done
      </Badge>
    );
  }
  const days = daysRelativeToDue(deadline.dueDate);
  if (days < 0) {
    return (
      <Badge className="border-red-500/40 bg-red-500/15 text-red-400">
        {days === -1 ? "1 day overdue" : `${Math.abs(days)} days overdue`}
      </Badge>
    );
  }
  if (days === 0) {
    return (
      <Badge className="border-yellow-500/40 bg-yellow-500/15 text-yellow-400">
        Due today
      </Badge>
    );
  }
  return (
    <Badge className="border-yellow-500/40 bg-yellow-500/15 text-yellow-400">
      {days === 1 ? "1 day left" : `${days} days left`}
    </Badge>
  );
}

export function CalendarClient({
  grouped,
  systems,
  teamMembers,
}: {
  grouped: { pending: SerializedDeadline[]; completed: SerializedDeadline[] };
  systems: { id: string; name: string }[];
  teamMembers: { id: string; email: string; name: string | null }[];
}) {
  const allDeadlines = useMemo(
    () => [...grouped.pending, ...grouped.completed],
    [grouped.pending, grouped.completed]
  );

  const [filter, setFilter] = useState<FilterTab>("all");
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    switch (filter) {
      case "overdue":
        return allDeadlines.filter(isOverdue);
      case "upcoming":
        return allDeadlines.filter(isUpcomingWindow);
      case "completed":
        return allDeadlines.filter((d) => d.status === "completed");
      default:
        return allDeadlines;
    }
  }, [allDeadlines, filter]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [filtered]
  );

  const tabs: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "overdue", label: "Overdue" },
    { id: "upcoming", label: "Upcoming (30d)" },
    { id: "completed", label: "Completed" },
  ];

  function cardAccent(d: SerializedDeadline) {
    if (d.status === "completed") {
      return "border-green-500/25 bg-green-500/[0.03]";
    }
    if (isOverdue(d)) {
      return "border-red-500/60 bg-red-500/[0.04]";
    }
    if (d.status === "pending") {
      return "border-yellow-500/25 bg-yellow-500/[0.03]";
    }
    return "";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Compliance Calendar</h1>
          <p className="text-muted-foreground">
            {allDeadlines.length} deadline
            {allDeadlines.length !== 1 ? "s" : ""} ·{" "}
            {grouped.pending.length} pending
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Add Deadline
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.id}
            type="button"
            size="sm"
            variant={filter === t.id ? "default" : "outline"}
            onClick={() => setFilter(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add custom deadline</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={(formData) => {
                startTransition(async () => {
                  await createDeadlineAction(formData);
                  setShowForm(false);
                });
              }}
              className="grid gap-4 sm:grid-cols-2"
            >
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Title *</label>
                <Input name="title" placeholder="e.g. Internal legal review" required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea name="description" placeholder="Optional details..." />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Due date *</label>
                <Input name="dueDate" type="datetime-local" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <select
                  name="priority"
                  defaultValue="medium"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <select
                  name="category"
                  defaultValue="general"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">AI system</label>
                <select
                  name="aiSystemId"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Organization-wide</option>
                  {systems.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Assignee</label>
                <select
                  name="assigneeId"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name?.trim() || m.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving..." : "Create deadline"}
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
          </CardContent>
        </Card>
      )}

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <CalendarIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No deadlines in this view</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {filter === "all" && allDeadlines.length === 0
                ? "Classify a system as high-risk or limited-risk to auto-generate milestones, or add a custom deadline."
                : "Try another filter or add a new deadline."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative ml-2 border-l border-border pl-8">
          {sorted.map((d, i) => (
            <div
              key={d.id}
              className={cn(
                "relative pb-10 last:pb-0",
                i === 0 ? "pt-0" : ""
              )}
            >
              <div
                className={cn(
                  "absolute -left-[21px] top-3 h-2.5 w-2.5 rounded-full ring-4 ring-background",
                  d.status === "completed"
                    ? "bg-green-500"
                    : isOverdue(d)
                      ? "bg-red-500"
                      : "bg-yellow-500"
                )}
              />
              <Card className={cn("overflow-hidden border-2", cardAccent(d))}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold leading-tight">{d.title}</h3>
                        <Badge
                          className={cn(
                            "border font-normal capitalize",
                            priorityBadgeClass(d.priority)
                          )}
                        >
                          {d.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(d.dueDate).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      {d.aiSystem && (
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">
                            System:
                          </span>{" "}
                          {d.aiSystem.name}
                        </p>
                      )}
                      {!d.aiSystem && (
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">
                            Scope:
                          </span>{" "}
                          Organization-wide
                        </p>
                      )}
                      {d.assignee && (
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">
                            Assignee:
                          </span>{" "}
                          {d.assignee.name?.trim() || d.assignee.email}
                        </p>
                      )}
                      {d.description && (
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {d.description}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                      <CountdownBadge deadline={d} />
                      {d.status === "pending" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                          disabled={isPending}
                          onClick={() =>
                            startTransition(() => completeDeadlineAction(d.id))
                          }
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
