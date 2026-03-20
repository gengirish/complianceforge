"use client";

import { useState, useTransition } from "react";
import { FileText, Zap, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { generateDocAction } from "@/server/actions";
import { ANNEX_IV_SECTIONS } from "@/types";

interface SystemInfo {
  id: string;
  name: string;
  riskTier: string;
  sector: string;
  useCase: string;
}

interface DocumentRecord {
  id: string;
  aiSystemId: string;
  title: string;
  section: number;
  version: number;
  content: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  aiSystem: { name: string };
}

export function DocumentsClient({
  systems,
  documents,
}: {
  systems: SystemInfo[];
  documents: DocumentRecord[];
}) {
  const [selectedSystemId, setSelectedSystemId] = useState("");
  const [generatingSection, setGeneratingSection] = useState<number | null>(null);
  const [viewingDoc, setViewingDoc] = useState<DocumentRecord | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedSystem = systems.find((s) => s.id === selectedSystemId);
  const systemDocs = documents.filter((d) => d.aiSystemId === selectedSystemId);
  const generatedSections = new Set(systemDocs.map((d) => d.section));

  function handleGenerate(sectionNumber: number, sectionTitle: string) {
    if (!selectedSystemId) return;
    setGeneratingSection(sectionNumber);
    startTransition(async () => {
      await generateDocAction(selectedSystemId, sectionNumber, sectionTitle);
      setGeneratingSection(null);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Document Generator</h1>
        <p className="text-muted-foreground">
          Generate EU AI Act Annex IV technical documentation (Article 11)
        </p>
      </div>

      {systems.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Systems Available</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add and classify AI systems first, then generate documentation.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* System Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select AI System</CardTitle>
              <CardDescription>
                Choose a system to generate Annex IV documentation for
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {systems.map((sys) => (
                  <button
                    key={sys.id}
                    onClick={() => {
                      setSelectedSystemId(sys.id);
                      setViewingDoc(null);
                    }}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      selectedSystemId === sys.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{sys.name}</p>
                      <RiskBadge tier={sys.riskTier} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {sys.sector}
                    </p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Document Viewer */}
          {viewingDoc && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{viewingDoc.title}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewingDoc(null)}
                  >
                    Close
                  </Button>
                </div>
                <CardDescription>
                  Version {viewingDoc.version} — {viewingDoc.status}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-invert max-w-none rounded-lg bg-muted/30 p-6 text-sm leading-relaxed whitespace-pre-wrap">
                  {viewingDoc.content}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Annex IV Sections */}
          {selectedSystem && !viewingDoc && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Annex IV Documentation — {selectedSystem.name}
                </CardTitle>
                <CardDescription>
                  17 required sections per Article 11. Generate individually or
                  view existing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {ANNEX_IV_SECTIONS.map((section) => {
                    const doc = systemDocs.find(
                      (d) => d.section === section.number
                    );
                    const isGenerating = generatingSection === section.number;

                    return (
                      <div
                        key={section.number}
                        className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {section.number}
                          </span>
                          <div>
                            <p className="text-sm font-medium">
                              {section.title}
                            </p>
                            {doc && (
                              <p className="text-xs text-muted-foreground">
                                v{doc.version} — Generated{" "}
                                {new Date(doc.createdAt).toLocaleDateString("en-GB")}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc && (
                            <>
                              <Badge variant="secondary" className="text-xs">
                                {doc.status}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewingDoc(doc)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant={doc ? "outline" : "default"}
                            size="sm"
                            onClick={() =>
                              handleGenerate(section.number, section.title)
                            }
                            disabled={isPending}
                          >
                            {isGenerating ? (
                              <>
                                <Zap className="h-3.5 w-3.5 animate-pulse" />
                                Generating...
                              </>
                            ) : doc ? (
                              "Regenerate"
                            ) : (
                              "Generate"
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Progress */}
                <div className="mt-6 flex items-center justify-between rounded-lg bg-muted/50 p-4">
                  <div className="text-sm">
                    <span className="font-medium">Progress: </span>
                    {generatedSections.size} / {ANNEX_IV_SECTIONS.length}{" "}
                    sections generated
                  </div>
                  <div className="h-2 w-48 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${(generatedSections.size / ANNEX_IV_SECTIONS.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
