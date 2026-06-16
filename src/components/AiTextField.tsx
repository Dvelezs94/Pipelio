"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { improveTextWithAi } from "@/app/actions/ai-text";
import { cn } from "@/lib/utils";
import { Loader2, Sparkles } from "lucide-react";

type AiTextFieldProps = {
  value: string;
  onChange: (value: string) => void;
  context?: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
};

export function AiTextField({
  value,
  onChange,
  context,
  placeholder,
  multiline = false,
  rows = 4,
  className,
  inputClassName,
  disabled,
}: AiTextFieldProps) {
  const [prompt, setPrompt] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleImprove() {
    setLoading(true);
    try {
      const res = await improveTextWithAi(value, {
        context,
        userPrompt: prompt.trim() || undefined,
      });
      if (res.success) {
        onChange(res.text);
        setOpen(false);
        setPrompt("");
      } else {
        alert(res.error);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <div className="relative">
        {multiline ? (
          <textarea
            className={cn(
              "w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground pr-10",
              inputClassName
            )}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            disabled={disabled || loading}
          />
        ) : (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={cn("pr-10", inputClassName)}
            disabled={disabled || loading}
          />
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1 h-7 w-7"
          title="Improve with AI"
          onClick={() => setOpen((v) => !v)}
          disabled={disabled || loading || !value.trim()}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        </Button>
      </div>
      {open && (
        <div className="mt-2 space-y-2 rounded-md border bg-muted/30 p-2">
          <textarea
            className="w-full min-h-[60px] rounded-md border bg-background px-2 py-1.5 text-xs"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Optional: e.g. make shorter, more formal, add a CTA..."
            disabled={loading}
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleImprove} disabled={loading || !value.trim()}>
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3 mr-1 animate-spin" />
                  Improving...
                </>
              ) : (
                "Improve with AI"
              )}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
