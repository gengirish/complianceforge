"use client";

import { useState, useTransition } from "react";
import {
  Shield,
  Zap,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { RiskBadge } from "@/components/ui/badge";
import { classifySystemAction } from "@/server/actions";
import type { RiskClassificationResult } from "@/lib/claude";

interface SystemSummary {
  id: string;
  name: string;
  sector: string;
  useCase: string;
  riskTier: string;
  dataInputs: string | null;
  decisionImpact: string | null;
  endUsers: string | null;
  deploymentRegion: string;
}

const TIER_CONFIG = {
  unacceptable: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    label: "Prohibited",
  },
  high: {
    icon: AlertTriangle,
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20",
    label: "High Risk",
  },
  limited: {
    icon: Info,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20",
    label: "Limited Risk",
  },
  minimal: {
    icon: CheckCircle,
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
    label: "Minimal Risk",
  },
} as const;

export function ClassifierClient({
  systems,
}: {
  systems: SystemSummary[];
}) {
  const [selectedId, setSelectedId] = useState("");
  const [result, setResult] = useState<RiskClassificationResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selected = systems.find((s) => s.id === selectedId);

  function handleClassify() {
    if (!selectedId) return;
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const res = await classifySystemAction(selectedId);
        setResult(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Classification failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Risk Classifier Engine</h1>
        <p className="text-muted-foreground">
          AI-powered EU AI Act risk tier classification (Articles 5, 6 &amp; Annex III)
        </p>
      </div>

      {systems.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Systems to Classify</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add AI systems in the Inventory first, then classify them here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          {/* System Selector */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Select AI System</CardTitle>
                <CardDescription>
                  Choose a system to classify by EU AI Act risk tier
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {systems.map((sys) => (
                  <button
                    key={sys.id}
                    onClick={() => {
                      setSelectedId(sys.id);
                      setResult(null);
                      setError(null);
                    }}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selectedId === sys.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{sys.name}</p>
                      <RiskBadge tier={sys.riskTier} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {sys.sector}
                    </p>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Classification Panel */}
          <div className="space-y-6 lg:col-span-3">
            {selected && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">System Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">Name</dt>
                      <dd className="font-medium">{selected.name}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Sector</dt>
                      <dd>{selected.sector}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-muted-foreground">Use Case</dt>
                      <dd>{selected.useCase}</dd>
                    </div>
                    {selected.dataInputs && (
                      <div>
                        <dt className="text-muted-foreground">Data Inputs</dt>
                        <dd>{selected.dataInputs}</dd>
                      </div>
                    )}
                    {selected.decisionImpact && (
                      <div>
                        <dt className="text-muted-foreground">Decision Impact</dt>
                        <dd>{selected.decisionImpact}</dd>
                      </div>
                    )}
                  </dl>
                  <Button
                    className="mt-6 w-full"
                    onClick={handleClassify}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <>
                        <Zap className="h-4 w-4 animate-pulse" />
                        Classifying with AI...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4" />
                        Classify Risk Tier
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {error && (
              <Card className="border-red-500/20 bg-red-500/5">
                <CardContent className="p-4 text-sm text-red-400">
                  {error}
                </CardContent>
              </Card>
            )}

            {result && (
              <ClassificationResult result={result} systemName={selected?.name ?? ""} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ClassificationResult({
  result,
  systemName,
}: {
  result: RiskClassificationResult;
  systemName: string;
}) {
  const config = TIER_CONFIG[result.riskTier] ?? TIER_CONFIG.minimal;
  const TierIcon = config.icon;

  return (
    <div className="space-y-4">
      {/* Result Header */}
      <Card className={`border ${config.bg}`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`rounded-full p-3 ${config.bg}`}>
              <TierIcon className={`h-8 w-8 ${config.color}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{systemName}</p>
              <p className={`text-2xl font-bold ${config.color}`}>
                {config.label}
              </p>
              <p className="text-sm text-muted-foreground">
                Confidence: {(result.confidence * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Justification */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Legal Justification</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{result.justification}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {result.keyArticles.map((art) => (
              <span
                key={art}
                className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
              >
                Article {art}
              </span>
            ))}
          </div>
          {result.annexIiiCategory && (
            <p className="mt-3 text-sm text-muted-foreground">
              <span className="font-medium">Annex III Category:</span>{" "}
              {result.annexIiiCategory}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compliance Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {result.requirements.map((req, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {req}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recommended Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {result.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                {rec}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
