import Link from "next/link";
import type { Route } from "next";
import { db } from "@/server/db";
import {
  calculateComplianceScore,
  getScoreGrade,
  getScoreStyle,
  SCORE_BREAKDOWN,
} from "@/lib/compliance-scoring";
import type { ComplianceScoreResult } from "@/lib/compliance-scoring";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Target } from "lucide-react";

export type ComplianceScoreRow = { id: string; name: string } & ComplianceScoreResult;

export async function loadComplianceScoreRows(
  orgId: string
): Promise<ComplianceScoreRow[]> {
  const systems = await db.aiSystem.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return Promise.all(
    systems.map(async (s) => {
      const result = await calculateComplianceScore(s.id);
      return { id: s.id, name: s.name, ...result };
    })
  );
}

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const { stroke } = getScoreStyle(grade);
  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="relative h-[4.5rem] w-[4.5rem] shrink-0">
      <svg
        className="h-full w-full -rotate-90"
        viewBox="0 0 80 80"
        aria-hidden
      >
        <circle
          className="stroke-muted/35"
          cx="40"
          cy="40"
          r={r}
          fill="none"
          strokeWidth="7"
        />
        <circle
          className={cn(stroke, "transition-[stroke-dashoffset] duration-500")}
          cx="40"
          cy="40"
          r={r}
          fill="none"
          strokeWidth="7"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-bold tabular-nums leading-none">
          {score}
        </span>
        <span
          className={cn(
            "text-[10px] font-semibold uppercase leading-none",
            getScoreStyle(grade).text
          )}
        >
          {grade}
        </span>
      </div>
    </div>
  );
}

export function ComplianceScoresSection({
  rows,
  orgAverage,
}: {
  rows: ComplianceScoreRow[];
  orgAverage: number;
}) {
  const orgGrade = getScoreGrade(orgAverage);
  const orgStyle = getScoreStyle(orgGrade);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Compliance Scores
          </CardTitle>
          <CardDescription>
            Smart score from documentation, assessments, incidents, and
            calendar milestones (max 100 per system).
          </CardDescription>
        </div>
        <div
          className={cn(
            "group relative flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 ring-2 transition-colors hover:bg-muted/50",
            orgStyle.ring
          )}
        >
          <ScoreRing score={orgAverage} grade={orgGrade} />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Organization average
            </p>
            <p className={cn("text-2xl font-bold tabular-nums", orgStyle.text)}>
              {orgAverage}%
            </p>
          </div>
          <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-72 -translate-x-1/2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-card-foreground opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
            <p className="mb-1.5 font-semibold text-foreground">Score rubric</p>
            <ul className="max-h-48 space-y-1 overflow-y-auto text-muted-foreground">
              {SCORE_BREAKDOWN.map((c) => (
                <li key={c.id}>
                  <span className="font-medium text-foreground">{c.label}</span>
                  : up to {c.maxPoints} pts — {c.description}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add AI systems to see compliance scores.
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.id}>
                <div
                  className={cn(
                    "group relative flex flex-wrap items-center gap-4 rounded-lg border border-border p-3 transition-colors hover:bg-accent/40",
                    "ring-1 ring-transparent hover:ring-primary/15"
                  )}
                >
                  <ScoreRing score={row.score} grade={row.grade} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/inventory` as Route}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {row.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Grade {row.grade} · {row.score}/100
                    </p>
                  </div>
                  <div className="pointer-events-none absolute left-0 top-full z-20 mt-1 w-[min(100%,22rem)] rounded-lg border border-border bg-card p-3 text-xs text-card-foreground opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 sm:left-auto sm:right-0 sm:top-1/2 sm:mt-0 sm:w-80 sm:-translate-y-1/2">
                    <p className="mb-2 font-semibold text-foreground">
                      Breakdown — {row.name}
                    </p>
                    <ul className="space-y-1.5">
                      {row.criteria.map((c) => (
                        <li
                          key={c.id}
                          className="flex justify-between gap-2 border-b border-border/60 pb-1 last:border-0"
                        >
                          <span className="text-muted-foreground">
                            {c.label}
                          </span>
                          <span className="shrink-0 tabular-nums text-foreground">
                            +{c.earned}/{c.max}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {row.criteria.find((c) => c.earned < c.max)?.detail ??
                        "All criteria at maximum for visible data."}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
