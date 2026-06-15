"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createUserScraperApiKey,
  revokeUserScraperApiKey,
} from "@/app/actions/scraper-api-keys";
import type { ScraperApiKeySummary } from "@/lib/scraper-api-keys";
import { Key, Loader2, Trash2 } from "lucide-react";

export function ExtensionKeysPanel({ initialKeys }: { initialKeys: ScraperApiKeySummary[] }) {
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState("Browser extension");
  const [loading, setLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);
    setNewKey(null);
    setLoading(true);
    try {
      const result = await createUserScraperApiKey(name);
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (!result.data) {
        setError("Failed to create API key.");
        return;
      }
      setNewKey(result.data.key);
      setKeys((prev) => [
        {
          id: result.data!.id,
          name: name.trim() || "Browser extension",
          keyPrefix: result.data!.keyPrefix,
          createdAt: new Date(),
          lastUsedAt: null,
        },
        ...prev,
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(keyId: string) {
    setError(null);
    setRevokingId(keyId);
    try {
      const result = await revokeUserScraperApiKey(keyId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
    } finally {
      setRevokingId(null);
    }
  }

  async function copyKey() {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Key className="h-5 w-5" />
            Extension API keys
          </CardTitle>
          <CardDescription>
            Generate a key and paste it into the Pipelio browser extension. Each key is tied to your
            account and can only access your projects.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="keyName" className="text-sm font-medium text-muted-foreground block mb-1">
              Key label
            </label>
            <Input
              id="keyName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Opera laptop"
            />
          </div>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate API key"}
          </Button>

          {newKey && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
              <p className="text-sm font-medium">Copy this key now — it won&apos;t be shown again.</p>
              <code className="block text-xs break-all bg-background border rounded p-2">{newKey}</code>
              <Button type="button" variant="secondary" size="sm" onClick={copyKey}>
                Copy to clipboard
              </Button>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your keys</CardTitle>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API keys yet.</p>
          ) : (
            <ul className="divide-y">
              {keys.map((key) => (
                <li key={key.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{key.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{key.keyPrefix}…</p>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(key.createdAt).toLocaleDateString()}
                      {key.lastUsedAt
                        ? ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                        : " · Never used"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRevoke(key.id)}
                    disabled={revokingId === key.id}
                    aria-label={`Revoke ${key.name}`}
                  >
                    {revokingId === key.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Extension setup</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <ol className="list-decimal list-inside space-y-1">
            <li>Install the Pipelio Scraper extension in Chrome or Opera.</li>
            <li>Generate an API key above and copy it.</li>
            <li>In the extension popup, enter your Pipelio app URL and paste the API key.</li>
            <li>Click Connect — your projects will load; pick one for scraped data.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
