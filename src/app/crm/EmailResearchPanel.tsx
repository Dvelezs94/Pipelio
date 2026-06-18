"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  lookupExecutiveEmailAi,
  researchLeadEmail,
  type AiExecutiveEmailResult,
  type EmailResearchResult,
} from "@/app/actions/email-research";
import { ExternalLink, Loader2, Search, Sparkles, UserSearch } from "lucide-react";

type AiLookupState = {
  ceo?: AiExecutiveEmailResult & { success: true };
  cto?: AiExecutiveEmailResult & { success: true };
};

export function EmailResearchPanel({
  companyName,
  website,
  onSelectEmail,
}: {
  companyName: string;
  website: string | null | undefined;
  onSelectEmail: (email: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState<"ceo" | "cto" | null>(null);
  const [result, setResult] = useState<EmailResearchResult | null>(null);
  const [aiResults, setAiResults] = useState<AiLookupState>({});
  const [error, setError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  async function handleResearch() {
    if (!website?.trim()) {
      setError("Add a company website first to research emails.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await researchLeadEmail(companyName, website);
      setResult(data);
      if (!data.domain && data.foundOnSite.length === 0) {
        setError("Could not extract a domain from the website URL.");
      }
    } catch {
      setError("Research failed. Try the search links below.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAiLookup(role: "ceo" | "cto") {
    setAiLoading(role);
    setAiError(null);
    try {
      const data = await lookupExecutiveEmailAi(companyName, website, role);
      if (data.success) {
        setAiResults((prev) => ({ ...prev, [role]: data }));
      } else {
        setAiError(data.error);
      }
    } catch {
      setAiError("AI lookup failed. Check DEEPSEEK_API_KEY in .env.");
    } finally {
      setAiLoading(null);
    }
  }

  const showGuesses = result?.guesses ?? [];
  const showFound = result?.foundOnSite ?? [];
  const showLinks = result?.researchLinks ?? [];

  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
          <UserSearch className="h-3.5 w-3.5" />
          Find CEO / CTO email (free)
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 h-8"
          onClick={handleResearch}
          disabled={loading || !website?.trim()}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
          {loading ? "Scanning site…" : "Research emails"}
        </Button>
      </div>

      {!website?.trim() && (
        <p className="text-xs text-muted-foreground">Set a website on this lead to scan for emails and suggest patterns.</p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {result?.domain && (
        <p className="text-xs text-muted-foreground">
          Domain: <span className="font-mono text-foreground">{result.domain}</span>
          {result.pagesChecked.length > 0 && (
            <> · scanned {result.pagesChecked.join(", ")}</>
          )}
        </p>
      )}

      {showFound.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Found on website</p>
          <div className="flex flex-wrap gap-1.5">
            {showFound.map((email) => (
              <button
                key={email}
                type="button"
                onClick={() => onSelectEmail(email)}
                className="text-xs font-mono rounded-md border bg-card px-2 py-1 hover:bg-primary/10 hover:border-primary transition-colors"
                title="Use this email"
              >
                {email}
              </button>
            ))}
          </div>
        </div>
      )}

      {showGuesses.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Common executive patterns (verify before sending)</p>
          <div className="flex flex-wrap gap-1.5">
            {showGuesses.map(({ email, label }) => (
              <button
                key={email}
                type="button"
                onClick={() => onSelectEmail(email)}
                className="text-xs rounded-md border bg-card px-2 py-1 hover:bg-primary/10 hover:border-primary transition-colors"
                title={`Use ${email}`}
              >
                <span className="text-muted-foreground mr-1">{label}</span>
                <span className="font-mono">{email}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {(showLinks.length > 0 || !result) && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Manual research links</p>
          <div className="flex flex-wrap gap-1.5">
            {(result ? showLinks : buildFallbackLinks(companyName)).map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs rounded-md border bg-card px-2 py-1 hover:bg-accent transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">AI email lookup (DeepSeek)</p>
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={() => void handleAiLookup("ceo")}
            disabled={aiLoading !== null}
          >
            {aiLoading === "ceo" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            AI: CEO email
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={() => void handleAiLookup("cto")}
            disabled={aiLoading !== null}
          >
            {aiLoading === "cto" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            AI: CTO email
          </Button>
        </div>
        {aiError && <p className="text-xs text-destructive">{aiError}</p>}
        {(aiResults.ceo || aiResults.cto) && (
          <div className="flex flex-wrap gap-1.5">
            {aiResults.ceo && (
              <AiEmailChip
                role="CEO"
                result={aiResults.ceo}
                onSelect={onSelectEmail}
              />
            )}
            {aiResults.cto && (
              <AiEmailChip
                role="CTO"
                result={aiResults.cto}
                onSelect={onSelectEmail}
              />
            )}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          AI suggestions may be wrong — verify before sending.
        </p>
      </div>
    </div>
  );
}

function AiEmailChip({
  role,
  result,
  onSelect,
}: {
  role: string;
  result: AiExecutiveEmailResult & { success: true };
  onSelect: (email: string) => void;
}) {
  const title = [
    result.personName,
    result.confidence ? `${result.confidence} confidence` : null,
    result.note,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      onClick={() => onSelect(result.email)}
      className="text-xs rounded-md border bg-card px-2 py-1 hover:bg-primary/10 hover:border-primary transition-colors text-left"
      title={title || `Use ${result.email}`}
    >
      <span className="text-muted-foreground mr-1">AI {role}</span>
      {result.personName && <span className="text-muted-foreground mr-1">{result.personName}</span>}
      <span className="font-mono">{result.email}</span>
    </button>
  );
}

function buildFallbackLinks(companyName: string) {
  const q = encodeURIComponent;
  return [
    { label: "Google: CEO email", href: `https://www.google.com/search?q=${q(`"${companyName}" CEO email`)}` },
    { label: "Google: CTO email", href: `https://www.google.com/search?q=${q(`"${companyName}" CTO email`)}` },
    { label: "LinkedIn: CEO", href: `https://www.linkedin.com/search/results/people/?keywords=${q(`${companyName} CEO`)}` },
    { label: "LinkedIn: CTO", href: `https://www.linkedin.com/search/results/people/?keywords=${q(`${companyName} CTO`)}` },
  ];
}
