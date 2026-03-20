"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskBadge, StatusBadge } from "@/components/ui/badge";
import { createSystemAction, deleteSystemAction } from "@/server/actions";
import { EU_AI_ACT_SECTORS } from "@/types";

interface SerializedSystem {
  id: string;
  name: string;
  description: string | null;
  sector: string;
  useCase: string;
  provider: string | null;
  version: string | null;
  dataInputs: string | null;
  decisionImpact: string | null;
  endUsers: string | null;
  deploymentRegion: string;
  riskTier: string;
  complianceStatus: string;
  complianceScore: number;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export function InventoryClient({
  systems,
}: {
  systems: SerializedSystem[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = systems.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.sector.toLowerCase().includes(search.toLowerCase()) ||
      s.useCase.toLowerCase().includes(search.toLowerCase())
  );

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    startTransition(() => deleteSystemAction(id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI System Inventory</h1>
          <p className="text-muted-foreground">
            {systems.length} system{systems.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Add System
        </Button>
      </div>

      {/* Add System Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Register New AI System</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={(formData) => {
                startTransition(async () => {
                  await createSystemAction(formData);
                  setShowForm(false);
                });
              }}
              className="grid gap-4 sm:grid-cols-2"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">System Name *</label>
                <Input name="name" placeholder="e.g. Customer Churn Predictor" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sector *</label>
                <select
                  name="sector"
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select sector...</option>
                  {EU_AI_ACT_SECTORS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Use Case *</label>
                <Textarea
                  name="useCase"
                  placeholder="Describe what this AI system does..."
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Provider</label>
                <Input name="provider" placeholder="e.g. Internal, OpenAI, Custom" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Version</label>
                <Input name="version" placeholder="e.g. v2.1.0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Inputs</label>
                <Input name="dataInputs" placeholder="e.g. Customer transaction history, demographics" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Decision Impact</label>
                <Input name="decisionImpact" placeholder="e.g. Determines credit eligibility" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Users</label>
                <Input name="endUsers" placeholder="e.g. Loan officers, automated system" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Deployment Region</label>
                <Input name="deploymentRegion" placeholder="EU" defaultValue="EU" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea name="description" placeholder="Additional details..." />
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Creating..." : "Create System"}
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search systems by name, sector, or use case..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Systems Table */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No AI Systems Found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {systems.length === 0
                ? "Register your first AI system to begin compliance tracking."
                : "No systems match your search."}
            </p>
            {systems.length === 0 && (
              <Button className="mt-4" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" />
                Add Your First System
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">System</th>
                <th className="px-4 py-3 text-left font-medium">Sector</th>
                <th className="px-4 py-3 text-left font-medium">Risk Tier</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-center font-medium">Score</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((system) => (
                <tr
                  key={system.id}
                  className="border-b border-border transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{system.name}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {system.useCase}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {system.sector}
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge tier={system.riskTier} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={system.complianceStatus} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`font-bold ${
                        system.complianceScore >= 60
                          ? "text-green-400"
                          : system.complianceScore >= 30
                            ? "text-yellow-400"
                            : "text-muted-foreground"
                      }`}
                    >
                      {system.complianceScore}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(system.id, system.name)}
                      disabled={isPending}
                      className="text-muted-foreground hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
