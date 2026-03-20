"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitBranch, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskBadge } from "@/components/ui/badge";
import {
  scanRepoAction,
  importScanFindingAction,
  type ScanRepoActionResult,
} from "@/server/actions";
import type { ScanFinding } from "@/lib/github-scanner";

export interface ScanHistoryRow {
  id: string;
  repository: string;
  branch: string;
  scanDate: string;
  totalFindings: number;
  reviewRequired: number;
  status: string;
  scannedByName: string;
}

function formatFilesSummary(files: string[]): string {
  if (files.length === 0) return "—";
  if (files.length <= 2) return files.join(", ");
  return `${files.slice(0, 2).join(", ")} +${files.length - 2} more`;
}

export function ScannerClient({ history }: { history: ScanHistoryRow[] }) {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [token, setToken] = useState("");
  const [scanRunning, setScanRunning] = useState(false);
  const [importingIndex, setImportingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<ScanRepoActionResult | null>(null);

  async function runScan() {
    setError(null);
    setLastScan(null);
    setScanRunning(true);
    try {
      const res = await scanRepoAction(repoUrl, token);
      setLastScan(res);
      router.refresh();
    } catch (e) {
      setLastScan(null);
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanRunning(false);
    }
  }

  async function runImport(scanResultId: string, findingIndex: number) {
    setError(null);
    setImportingIndex(findingIndex);
    try {
      await importScanFindingAction(scanResultId, findingIndex);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImportingIndex(null);
    }
  }

  const findings: ScanFinding[] = lastScan?.findings ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">GitHub Repository Scanner</h1>
          <p className="text-muted-foreground">
            Detect AI/ML libraries, model files, and API configuration — then
            import into your inventory.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Scan a repository
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Repository</label>
              <Input
                placeholder="owner/repo or https://github.com/owner/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                disabled={scanRunning}
              />
              <p className="text-xs text-muted-foreground">
                Public repos work without a token. Private repos need a PAT with{" "}
                <code className="rounded bg-muted px-1">repo</code> read scope.
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">
                GitHub token (optional for public repos)
              </label>
              <Input
                type="password"
                autoComplete="off"
                placeholder="ghp_…"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={scanRunning}
              />
              <p className="text-xs text-muted-foreground">
                Stored only in this browser session — never saved on our servers.
              </p>
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          <Button
            className="gap-2"
            onClick={() => void runScan()}
            disabled={scanRunning || importingIndex !== null || !repoUrl.trim()}
          >
            {scanRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scanning…
              </>
            ) : (
              <>
                <GitBranch className="h-4 w-4" />
                Scan repository
              </>
            )}
          </Button>
          {lastScan && (
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">
                  {lastScan.repository}
                </span>{" "}
                · branch <span className="text-foreground">{lastScan.branch}</span>
              </p>
              {lastScan.truncatedTree && (
                <p className="text-amber-400">
                  GitHub returned a truncated file tree — some paths may be
                  missing.
                </p>
              )}
              {lastScan.errors.length > 0 && (
                <p className="text-amber-400">{lastScan.errors.join(" ")}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {lastScan && findings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Scan results</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">
                      Framework
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Files</th>
                    <th className="px-4 py-3 text-left font-medium">
                      Risk tier
                    </th>
                    <th className="px-4 py-3 text-center font-medium">
                      Confidence
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {findings.map((f, idx) => (
                    <tr
                      key={`${f.name}-${idx}`}
                      className="border-b border-border transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{f.name}</p>
                        {f.dependencies.length > 0 && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {f.dependencies.slice(0, 6).join(", ")}
                            {f.dependencies.length > 6
                              ? ` +${f.dependencies.length - 6}`
                              : ""}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {f.framework}
                      </td>
                      <td
                        className="max-w-[200px] px-4 py-3 text-muted-foreground"
                        title={f.files.join("\n")}
                      >
                        <span className="line-clamp-2 text-xs">
                          {formatFilesSummary(f.files)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <RiskBadge tier={f.suggestedRiskTier} />
                      </td>
                      <td className="px-4 py-3 text-center font-medium">
                        {(f.confidence * 100).toFixed(0)}%
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-2"
                          disabled={scanRunning || importingIndex !== null}
                          onClick={() =>
                            void runImport(lastScan.scanResultId, idx)
                          }
                        >
                          {importingIndex === idx ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : null}
                          Import to inventory
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Scan history</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No scans yet. Run a scan to build your audit trail.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">
                      Repository
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Branch</th>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-center font-medium">
                      Findings
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Scanned by
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-mono text-xs">
                        {row.repository}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.branch}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(row.scanDate).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.totalFindings}
                        {row.reviewRequired > 0 && (
                          <span className="ml-1 text-xs text-amber-400">
                            ({row.reviewRequired} review)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.scannedByName}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.status.replace(/_/g, " ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
