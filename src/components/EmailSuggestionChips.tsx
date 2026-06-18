"use client";

import { cn } from "@/lib/utils";
import type { EmailSuggestion } from "@/lib/lead-email-suggestions";

export function EmailSuggestionChips({
  suggestions,
  value,
  onSelect,
  className,
  compact,
}: {
  suggestions: EmailSuggestion[];
  value: string;
  onSelect: (email: string) => void;
  className?: string;
  compact?: boolean;
}) {
  const current = value.trim().toLowerCase();
  const visible = suggestions.filter((s) => s.email.toLowerCase() !== current);
  if (visible.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {visible.map((suggestion) => (
        <button
          key={suggestion.email}
          type="button"
          onClick={() => onSelect(suggestion.email)}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border bg-card hover:bg-primary/10 hover:border-primary transition-colors text-left",
            compact ? "px-2 py-0.5 text-[11px]" : "px-2 py-1 text-xs"
          )}
          title={`Use ${suggestion.email}`}
        >
          <span className="text-muted-foreground">{suggestion.label}</span>
          <span className="font-mono text-foreground">{suggestion.email}</span>
        </button>
      ))}
    </div>
  );
}
