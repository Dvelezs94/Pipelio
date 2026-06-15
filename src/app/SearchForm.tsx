"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INDUSTRIES } from "@/lib/constants";
import { searchByIndustry } from "@/app/actions/search";
import {
  DEFAULT_SEARCH_SOURCES,
  SEARCH_SOURCES,
  type SearchSourceId,
} from "@/lib/search-sources";
import { Search, Loader2 } from "lucide-react";

export function SearchForm() {
  const router = useRouter();
  const [industry, setIndustry] = useState<string>(INDUSTRIES[0]);
  const [sources, setSources] = useState<SearchSourceId[]>([...DEFAULT_SEARCH_SOURCES]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSource(id: SearchSourceId, checked: boolean) {
    setSources((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      const next = prev.filter((s) => s !== id);
      return next.length > 0 ? next : prev;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await searchByIndustry(industry, { sources });
      if (result.success) {
        const params = new URLSearchParams();
        if (result.warnings?.length) {
          params.set("warnings", result.warnings.join("\n"));
        }
        const qs = params.toString();
        router.push(`/results/${result.searchId}${qs ? `?${qs}` : ""}`);
        return;
      }
      setError(result.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-6 w-6" />
          Industry Research
        </CardTitle>
        <CardDescription>
          Find SaaS, e-commerce, dev shops, and other internet companies by industry.
          Choose which data sources to query.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="industry" className="text-sm font-medium text-muted-foreground block mb-1">
              Industry
            </label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger id="industry" className="max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((ind) => (
                  <SelectItem key={ind} value={ind}>
                    {ind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-muted-foreground mb-2">Data sources</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {SEARCH_SOURCES.map(({ id, label, hint }) => (
                <label
                  key={id}
                  htmlFor={`source-${id}`}
                  className="flex items-start gap-2 rounded-lg border p-3 cursor-pointer hover:bg-muted/40 has-[:checked]:border-primary/50 has-[:checked]:bg-muted/30"
                >
                  <Checkbox
                    id={`source-${id}`}
                    checked={sources.includes(id)}
                    onCheckedChange={(checked) => toggleSource(id, checked === true)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="text-sm font-medium block">{label}</span>
                    <span className="text-xs text-muted-foreground">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {error && (
            <div
              className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 whitespace-pre-wrap"
              role="alert"
            >
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading || !industry || sources.length === 0} className="w-full sm:w-auto">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              "Find Companies"
            )}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground">
          Clutch uses the{" "}
          <a
            href="https://apify.com/curious_coder/clutch-scraper"
            className="underline hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            Apify Clutch scraper
          </a>{" "}
          — add <code className="text-xs">APIFY_TOKEN</code> to <code className="text-xs">.env</code>.
          Product Hunt and GitHub also need tokens for best results; YC works without keys.
        </p>
      </CardContent>
    </Card>
  );
}
