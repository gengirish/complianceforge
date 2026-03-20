"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CONFORMITY_CATEGORY_LABELS,
  CONFORMITY_CATEGORY_ORDER,
  CONFORMITY_REQUIREMENTS,
  buildInitialRequirementState,
  calculateCompletionPercentage,
  type ConformityCategory,
  type StoredConformityRequirement,
} from "@/lib/conformity-requirements";
import {
  completeConformityAssessmentAction,
  startConformityAssessmentAction,
  updateConformityRequirementAction,
} from "@/server/actions";
import type {
  SerializedConformityAssessment,
  SerializedHighRiskSystem,
} from "./types";

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

const requirementsByCategory = CONFORMITY_CATEGORY_ORDER.reduce(
  (acc, cat) => {
    acc[cat] = CONFORMITY_REQUIREMENTS.filter((r) => r.category === cat);
    return acc;
  },
  {} as Record<ConformityCategory, typeof CONFORMITY_REQUIREMENTS>
);

export function ConformityClient({
  assessments,
  highRiskSystems,
}: {
  assessments: SerializedConformityAssessment[];
  highRiskSystems: SerializedHighRiskSystem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedSystemId, setSelectedSystemId] = useState<string>("");
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(
    null
  );
  const [localRequirements, setLocalRequirements] = useState<
    StoredConformityRequirement[] | null
  >(null);

  const activeAssessment = useMemo(
    () => assessments.find((a) => a.id === activeAssessmentId) ?? null,
    [assessments, activeAssessmentId]
  );

  useEffect(() => {
    if (!activeAssessmentId || !activeAssessment) {
      if (!activeAssessmentId) setLocalRequirements(null);
      return;
    }
    setLocalRequirements(activeAssessment.requirements);
  }, [activeAssessmentId, activeAssessment]);

  function openNewWizard() {
    setError(null);
    setWizardOpen(true);
    setStep(1);
    setSelectedSystemId(highRiskSystems[0]?.id ?? "");
    setActiveAssessmentId(null);
    setLocalRequirements(null);
  }

  function resumeAssessment(id: string) {
    const a = assessments.find((x) => x.id === id);
    if (!a) return;
    setError(null);
    setWizardOpen(true);
    setActiveAssessmentId(id);
    setLocalRequirements(a.requirements);
    setStep(a.status === "completed" ? 3 : 2);
  }

  function closeWizard() {
    setWizardOpen(false);
    setStep(1);
    setActiveAssessmentId(null);
    setLocalRequirements(null);
    setError(null);
  }

  const completionPct = localRequirements
    ? calculateCompletionPercentage(localRequirements)
    : 0;

  const checklistReadOnly =
    activeAssessment?.status === "completed" || !localRequirements;

  function patchLocal(
    requirementId: string,
    patch: Partial<StoredConformityRequirement>
  ) {
    setLocalRequirements((prev) => {
      if (!prev) return prev;
      return prev.map((r) =>
        r.id === requirementId ? { ...r, ...patch } : r
      );
    });
  }

  function handleStartAssessment() {
    if (!selectedSystemId) {
      setError("Select an AI system.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const { id } = await startConformityAssessmentAction(selectedSystemId);
        setActiveAssessmentId(id);
        setLocalRequirements(buildInitialRequirementState());
        setStep(2);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start assessment");
      }
    });
  }

  function handleRequirementMetToggle(
    requirementId: string,
    met: boolean,
    row: StoredConformityRequirement
  ) {
    if (!activeAssessmentId || checklistReadOnly || !localRequirements) return;
    patchLocal(requirementId, { met });
    startTransition(async () => {
      try {
        await updateConformityRequirementAction(
          activeAssessmentId,
          requirementId,
          met,
          row.evidenceUrl,
          row.notes
        );
        router.refresh();
      } catch (e) {
        patchLocal(requirementId, { met: row.met });
        setError(e instanceof Error ? e.message : "Update failed");
      }
    });
  }

  function persistRequirementRow(row: StoredConformityRequirement) {
    if (!activeAssessmentId || checklistReadOnly) return;
    startTransition(async () => {
      try {
        await updateConformityRequirementAction(
          activeAssessmentId,
          row.id,
          row.met,
          row.evidenceUrl,
          row.notes
        );
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Update failed");
      }
    });
  }

  function handleComplete() {
    if (!activeAssessmentId) return;
    setError(null);
    startTransition(async () => {
      try {
        await completeConformityAssessmentAction(activeAssessmentId);
        router.refresh();
        closeWizard();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not complete");
      }
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Conformity assessment</h1>
          <p className="text-muted-foreground">
            EU AI Act Articles 8–15 checklist for high-risk systems. Track
            evidence and completion before sign-off.
          </p>
        </div>
        <Button
          onClick={openNewWizard}
          disabled={highRiskSystems.length === 0 || isPending}
        >
          <ClipboardCheck className="h-4 w-4" />
          New assessment
        </Button>
      </div>

      {highRiskSystems.length === 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No high-risk systems in your inventory. Classify a system as{" "}
            <span className="font-medium text-foreground">high</span> in the
            Risk Classifier to start a conformity assessment.
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold">Assessments</h2>
        {assessments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No conformity assessments yet. Start one to work through the
              checklist.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {assessments.map((a) => (
              <Card key={a.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">
                        {a.aiSystemName}
                      </CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Started{" "}
                        {new Date(a.startedAt).toLocaleDateString(undefined, {
                          dateStyle: "medium",
                        })}
                        {" · "}
                        <span
                          className={
                            a.status === "completed"
                              ? "text-green-400"
                              : "text-amber-400"
                          }
                        >
                          {a.status === "completed"
                            ? "Completed"
                            : "In progress"}
                        </span>
                      </p>
                    </div>
                    {a.status === "completed" && (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-green-400" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Completion</span>
                    <span className="font-semibold">{a.completionPct}%</span>
                  </div>
                  <ProgressBar pct={a.completionPct} />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => resumeAssessment(a.id)}
                  >
                    {a.status === "completed" ? "View summary" : "Continue"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {wizardOpen && (
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg">
              {step === 1 && "Step 1 — Select system"}
              {step === 2 && "Step 2 — Requirements checklist"}
              {step === 3 && "Step 3 — Summary"}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={closeWizard}>
              Close
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-2 text-xs font-medium text-muted-foreground">
              {[1, 2, 3].map((s) => (
                <span key={s} className={step === s ? "text-primary" : ""}>
                  {s}. {s === 1 ? "System" : s === 2 ? "Checklist" : "Summary"}
                </span>
              ))}
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Only high-risk AI systems can undergo this conformity
                  assessment.
                </p>
                <div className="space-y-2">
                  <label className="text-sm font-medium">AI system</label>
                  <select
                    value={selectedSystemId}
                    onChange={(e) => setSelectedSystemId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {highRiskSystems.length === 0 ? (
                      <option value="">No high-risk systems</option>
                    ) : (
                      highRiskSystems.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} — {s.sector}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={closeWizard}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleStartAssessment}
                    disabled={
                      !selectedSystemId ||
                      highRiskSystems.length === 0 ||
                      isPending
                    }
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Starting…
                      </>
                    ) : (
                      <>
                        Next
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && activeAssessmentId && localRequirements && (
              <div className="space-y-6">
                <div className="rounded-lg bg-muted/40 p-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium">Overall progress</span>
                    <span className="text-primary">{completionPct}%</span>
                  </div>
                  <ProgressBar pct={completionPct} />
                </div>

                {CONFORMITY_CATEGORY_ORDER.map((cat) => {
                  const defs = requirementsByCategory[cat];
                  if (!defs.length) return null;
                  return (
                    <div key={cat} className="space-y-3">
                      <h3 className="text-sm font-semibold text-foreground">
                        {CONFORMITY_CATEGORY_LABELS[cat]}
                      </h3>
                      <div className="space-y-4 rounded-lg border border-border p-4">
                        {defs.map((def) => {
                          const row =
                            localRequirements.find((r) => r.id === def.id) ??
                            ({
                              id: def.id,
                              met: false,
                              evidenceUrl: "",
                              notes: "",
                            } satisfies StoredConformityRequirement);
                          return (
                            <div
                              key={def.id}
                              className="space-y-3 border-b border-border pb-4 last:border-0 last:pb-0"
                            >
                              <div className="flex flex-wrap items-start gap-3">
                                <label className="flex cursor-pointer items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={row.met}
                                    disabled={checklistReadOnly || isPending}
                                    onChange={(e) =>
                                      handleRequirementMetToggle(
                                        def.id,
                                        e.target.checked,
                                        row
                                      )
                                    }
                                    className="h-4 w-4 rounded border-input"
                                  />
                                  <span className="font-medium">{def.title}</span>
                                </label>
                                <span className="text-xs text-muted-foreground">
                                  {def.articleRef}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {def.description}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground/80">
                                  Evidence expected:
                                </span>{" "}
                                {def.evidenceRequired.join(" · ")}
                              </p>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                  <label className="text-xs font-medium">
                                    Evidence URL
                                  </label>
                                  <Input
                                    placeholder="https://…"
                                    value={row.evidenceUrl}
                                    disabled={checklistReadOnly}
                                    onChange={(e) =>
                                      patchLocal(def.id, {
                                        evidenceUrl: e.target.value,
                                      })
                                    }
                                    onBlur={(e) =>
                                      persistRequirementRow({
                                        ...row,
                                        evidenceUrl: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div className="space-y-1.5 sm:col-span-2">
                                  <label className="text-xs font-medium">
                                    Notes
                                  </label>
                                  <Textarea
                                    placeholder="Context, gaps, owner…"
                                    rows={2}
                                    value={row.notes}
                                    disabled={checklistReadOnly}
                                    onChange={(e) =>
                                      patchLocal(def.id, {
                                        notes: e.target.value,
                                      })
                                    }
                                    onBlur={(e) =>
                                      persistRequirementRow({
                                        ...row,
                                        notes: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep(3)}
                    disabled={!activeAssessmentId}
                  >
                    Summary
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (!activeAssessmentId || !localRequirements) && (
              <p className="text-sm text-muted-foreground">
                Complete step 1 to load the checklist.
              </p>
            )}

            {step === 3 && activeAssessment && localRequirements && (
              <div className="space-y-6">
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="text-sm font-medium">
                    {activeAssessment.aiSystemName}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Completion</span>
                    <span>
                      {calculateCompletionPercentage(localRequirements)}%
                    </span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar
                      pct={calculateCompletionPercentage(localRequirements)}
                    />
                  </div>
                </div>

                <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
                  {localRequirements.map((r) => {
                    const def = CONFORMITY_REQUIREMENTS.find(
                      (x) => x.id === r.id
                    );
                    return (
                      <li
                        key={r.id}
                        className="flex items-start gap-2 rounded-md border border-border/60 px-3 py-2"
                      >
                        {r.met ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                        ) : (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">
                            {def?.title ?? r.id}
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              {def?.articleRef}
                            </span>
                          </p>
                          {r.evidenceUrl ? (
                            <p className="truncate text-xs text-primary/90">
                              {r.evidenceUrl}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Back to checklist
                  </Button>
                  {activeAssessment.status !== "completed" ? (
                    <Button
                      onClick={handleComplete}
                      disabled={
                        calculateCompletionPercentage(localRequirements) <
                          100 || isPending
                      }
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      Submit for review
                    </Button>
                  ) : (
                    <p className="text-sm text-green-400">
                      Assessment completed
                    </p>
                  )}
                </div>
                {activeAssessment.status !== "completed" &&
                  calculateCompletionPercentage(localRequirements) < 100 && (
                    <p className="text-xs text-muted-foreground">
                      Mark every requirement as met to submit.
                    </p>
                  )}
              </div>
            )}

            {step === 3 && (!activeAssessment || !localRequirements) && (
              <p className="text-sm text-muted-foreground">
                Open an assessment from the list or start a new one.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
