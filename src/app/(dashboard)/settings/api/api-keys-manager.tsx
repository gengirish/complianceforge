"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createApiKeyAction, revokeApiKeyAction } from "@/server/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Copy, Loader2, Trash2 } from "lucide-react";

export type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

type Props = {
  keys: ApiKeyRow[];
  baseUrl: string;
};

export function ApiKeysManager({ keys, baseUrl }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function copy(text: string) {
    void navigator.clipboard.writeText(text);
  }

  function createKey() {
    setError(null);
    startTransition(async () => {
      try {
        const { key } = await createApiKeyAction(name);
        setNewKey(key);
        setName("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not create key");
      }
    });
  }

  function revoke(id: string) {
    if (!window.confirm("Revoke this API key? Integrations using it will stop working.")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await revokeApiKeyAction(id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not revoke key");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create API key</CardTitle>
          <CardDescription>
            The full secret is shown only once. Store it securely; we only keep a
            hash.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <label htmlFor="api-key-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="api-key-name"
                placeholder="e.g. CI / Production"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={pending}
              />
            </div>
            <Button
              type="button"
              onClick={() => createKey()}
              disabled={pending || !name.trim()}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Create API Key
            </Button>
          </div>

          {newKey && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
              <p className="text-sm font-medium text-primary">
                Copy your key now — you won&apos;t see it again.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="break-all rounded bg-muted px-2 py-1 text-xs">
                  {newKey}
                </code>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => copy(newKey)}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setNewKey(null)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your API keys</CardTitle>
          <CardDescription>Prefix, usage, and revocation status</CardDescription>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No keys yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {keys.map((k) => (
                <li
                  key={k.id}
                  className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{k.name}</span>
                      {k.revokedAt ? (
                        <Badge variant="destructive">Revoked</Badge>
                      ) : (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      {k.keyPrefix}…
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(k.createdAt).toLocaleString()}
                      {k.lastUsedAt
                        ? ` · Last used ${new Date(k.lastUsedAt).toLocaleString()}`
                        : " · Never used"}
                    </p>
                  </div>
                  {!k.revokedAt && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={pending}
                      onClick={() => revoke(k.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Revoke
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">REST API</CardTitle>
          <CardDescription>
            Authenticate with{" "}
            <code className="rounded bg-muted px-1 text-xs">
              Authorization: Bearer cf_…
            </code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Base URL: <code className="text-foreground">{baseUrl}/api/v1</code>
          </p>
          <div className="space-y-2">
            <p className="font-medium">List systems</p>
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
              {`curl -s "${baseUrl}/api/v1/systems" \\
  -H "Authorization: Bearer YOUR_CF_KEY"`}
            </pre>
          </div>
          <div className="space-y-2">
            <p className="font-medium">Create system</p>
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
              {`curl -s -X POST "${baseUrl}/api/v1/systems" \\
  -H "Authorization: Bearer YOUR_CF_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"My AI","sector":"Healthcare","useCase":"Triage support"}'`}
            </pre>
          </div>
          <div className="space-y-2">
            <p className="font-medium">Get / update / delete system</p>
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
              {`GET    ${baseUrl}/api/v1/systems/{id}
PATCH  ${baseUrl}/api/v1/systems/{id}
DELETE ${baseUrl}/api/v1/systems/{id}`}
            </pre>
          </div>
          <div className="space-y-2">
            <p className="font-medium">Classify risk tier</p>
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
              {`curl -s -X POST "${baseUrl}/api/v1/systems/{id}/classify" \\
  -H "Authorization: Bearer YOUR_CF_KEY"`}
            </pre>
          </div>
          <div className="space-y-2">
            <p className="font-medium">Incidents</p>
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
              {`GET  ${baseUrl}/api/v1/incidents
POST ${baseUrl}/api/v1/incidents
# Body: aiSystemId, title, description, occurredAt, detectedAt (ISO), optional severity`}
            </pre>
          </div>
          <p className="text-xs text-muted-foreground">
            Success responses use{" "}
            <code className="rounded bg-muted px-1">{"{ \"data\": ... }"}</code>
            . Errors use{" "}
            <code className="rounded bg-muted px-1">{"{ \"error\": \"...\" }"}</code>{" "}
            with 4xx status codes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
