"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { improveTextWithAi } from "@/app/actions/ai-text";
import {
  TEMPLATE_VARIABLES,
  formatTemplatePlaceholder,
  invalidTemplatePlaceholders,
  type TemplateVarKey,
} from "@/lib/email-templates";
import { cn } from "@/lib/utils";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";

export type TemplateVariableFieldRef = {
  insertVariable: (key: TemplateVarKey, replacePartial?: boolean) => void;
  focus: () => void;
};

type TemplateVariableFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  aiContext?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  showVariableBar?: boolean;
  onFocus?: () => void;
};

function insertAtCursor(
  value: string,
  insertion: string,
  start: number,
  end: number
): { next: string; cursor: number } {
  const next = value.slice(0, start) + insertion + value.slice(end);
  return { next, cursor: start + insertion.length };
}

function getAutocompleteQuery(value: string, cursor: number): string | null {
  const before = value.slice(0, cursor);
  const open = before.lastIndexOf("{{");
  if (open === -1) return null;
  const afterOpen = before.slice(open + 2);
  if (afterOpen.includes("}}") || /\s/.test(afterOpen)) return null;
  return afterOpen;
}

export function TemplateVariableBar({
  onInsert,
  disabled,
  className,
}: {
  onInsert: (key: TemplateVarKey) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md border bg-muted/30 p-2 space-y-2", className)}>
      <p className="text-xs font-medium text-muted-foreground">Insert variable</p>
      <div className="flex flex-wrap gap-1.5">
        {TEMPLATE_VARIABLES.map((v) => (
          <Button
            key={v.key}
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs font-mono px-2"
            title={`${v.description}\nExample: ${v.example}`}
            disabled={disabled}
            onClick={() => onInsert(v.key)}
          >
            {formatTemplatePlaceholder(v.key)}
          </Button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug">
        Type <code className="rounded bg-muted px-1">{"{{"}</code> in subject or body for autocomplete.
        Variables are case-sensitive.
      </p>
    </div>
  );
}

export const TemplateVariableField = forwardRef<TemplateVariableFieldRef, TemplateVariableFieldProps>(
  function TemplateVariableField(
    {
      value,
      onChange,
      placeholder,
      multiline = false,
      rows = 6,
      aiContext,
      className,
      inputClassName,
      disabled,
      showVariableBar = false,
      onFocus,
    },
    ref
  ) {
    const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
    const [cursorPos, setCursorPos] = useState(0);
    const [aiOpen, setAiOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const invalid = useMemo(() => invalidTemplatePlaceholders(value), [value]);

    const query = getAutocompleteQuery(value, cursorPos);
    const suggestions = useMemo(() => {
      if (query === null) return [];
      const q = query.toLowerCase();
      return TEMPLATE_VARIABLES.filter(
        (v) =>
          v.key.toLowerCase().startsWith(q) ||
          v.label.toLowerCase().includes(q)
      );
    }, [query]);

    const showSuggestions = suggestions.length > 0 && query !== null;

    const syncCursor = useCallback(() => {
      const el = inputRef.current;
      if (el) setCursorPos(el.selectionStart ?? 0);
    }, []);

    const applyVariable = useCallback(
      (key: TemplateVarKey, replacePartial = false) => {
        const el = inputRef.current;
        const start = el?.selectionStart ?? value.length;
        const end = el?.selectionEnd ?? start;
        const token = formatTemplatePlaceholder(key);

        if (replacePartial && query !== null) {
          const open = value.slice(0, start).lastIndexOf("{{");
          if (open !== -1) {
            const { next, cursor: pos } = insertAtCursor(value, token, open, start);
            onChange(next);
            setCursorPos(pos);
            requestAnimationFrame(() => {
              el?.focus();
              el?.setSelectionRange(pos, pos);
            });
            return;
          }
        }

        const { next, cursor: pos } = insertAtCursor(value, token, start, end);
        onChange(next);
        setCursorPos(pos);
        requestAnimationFrame(() => {
          el?.focus();
          el?.setSelectionRange(pos, pos);
        });
      },
      [onChange, query, value]
    );

    useImperativeHandle(
      ref,
      () => ({
        insertVariable: applyVariable,
        focus: () => inputRef.current?.focus(),
      }),
      [applyVariable]
    );

    const handleChange = useCallback(
      (e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        onChange(e.target.value);
        setCursorPos(e.target.selectionStart ?? 0);
      },
      [onChange]
    );

    function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) {
      if (!showSuggestions) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        applyVariable(suggestions[activeIndex]!.key, true);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setActiveIndex(0);
      }
    }

    async function handleImprove() {
      if (!aiContext) return;
      setAiLoading(true);
      try {
        const res = await improveTextWithAi(value, {
          context: aiContext,
          userPrompt: aiPrompt.trim() || undefined,
        });
        if (res.success) {
          onChange(res.text);
          setAiOpen(false);
          setAiPrompt("");
        } else {
          alert(res.error);
        }
      } finally {
        setAiLoading(false);
      }
    }

    const fieldProps = {
      ref: inputRef as never,
      value,
      onChange: handleChange,
      onKeyDown: handleKeyDown,
      onFocus: () => {
        onFocus?.();
        syncCursor();
        setActiveIndex(0);
      },
      onClick: () => {
        syncCursor();
        setActiveIndex(0);
      },
      onKeyUp: syncCursor,
      onSelect: syncCursor,
      placeholder,
      disabled: disabled || aiLoading,
      className: cn("pr-10", inputClassName),
    };

    return (
      <div className={cn("space-y-2", className)}>
        {showVariableBar && (
          <TemplateVariableBar onInsert={applyVariable} disabled={disabled || aiLoading} />
        )}

        <div className="relative">
          {multiline ? (
            <textarea
              {...fieldProps}
              rows={rows}
              className={cn(
                "w-full rounded-md border bg-background px-3 py-2 text-sm",
                fieldProps.className
              )}
            />
          ) : (
            <Input {...fieldProps} />
          )}

          {showSuggestions && (
            <ul
              className="absolute z-50 left-0 right-10 mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md py-1"
              role="listbox"
            >
              {suggestions.map((v, i) => (
                <li key={v.key}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === activeIndex}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm hover:bg-muted",
                      i === activeIndex && "bg-muted"
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyVariable(v.key, true);
                    }}
                  >
                    <span className="font-mono text-xs">{formatTemplatePlaceholder(v.key)}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{v.label}</span>
                    <span className="block text-[11px] text-muted-foreground truncate">{v.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {aiContext && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-7 w-7"
              title="Improve with AI"
              onClick={() => setAiOpen((v) => !v)}
              disabled={disabled || aiLoading || !value.trim()}
            >
              {aiLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>

        {invalid.length > 0 && (
          <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              Unknown variables (won&apos;t be replaced when sending):{" "}
              {invalid.map((k) => `{{${k}}}`).join(", ")}
              . Type <code className="rounded bg-muted px-0.5">{"{{"}</code> to pick a valid name.
            </span>
          </p>
        )}

        {aiContext && aiOpen && (
          <div className="space-y-2 rounded-md border bg-muted/30 p-2">
            <textarea
              className="w-full min-h-[60px] rounded-md border bg-background px-2 py-1.5 text-xs"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Optional: e.g. make shorter, more formal, add a CTA..."
              disabled={aiLoading}
            />
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={() => void handleImprove()} disabled={aiLoading || !value.trim()}>
                {aiLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3 mr-1 animate-spin" />
                    Improving...
                  </>
                ) : (
                  "Improve with AI"
                )}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setAiOpen(false)} disabled={aiLoading}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }
);
