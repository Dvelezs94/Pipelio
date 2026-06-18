"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateCrmLeadTags } from "@/app/actions/crm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";

const TAG_COLOR_PALETTE = [
  "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
  "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-300",
  "bg-lime-100 text-lime-900 dark:bg-lime-950 dark:text-lime-300",
  "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
] as const;

function tagColorClasses(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) | 0;
  }
  return TAG_COLOR_PALETTE[Math.abs(hash) % TAG_COLOR_PALETTE.length];
}

function CrmLeadTagBadge({
  tag,
  compact,
  onRemove,
  removing,
}: {
  tag: string;
  compact?: boolean;
  onRemove?: () => void;
  removing?: boolean;
}) {
  const color = tagColorClasses(tag);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        color,
        compact ? "gap-0 px-1.5 py-0 text-[10px] leading-4" : "gap-1 text-xs",
        onRemove ? "pl-2 pr-1 py-0.5" : compact ? "" : "px-2 py-0.5"
      )}
    >
      {tag}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          className="rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-50"
          title={`Remove ${tag}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

export function CrmLeadTagList({
  tags,
  className,
  compact,
}: {
  tags: string[];
  className?: string;
  compact?: boolean;
}) {
  if (tags.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {tags.map((tag) => (
        <CrmLeadTagBadge key={tag} tag={tag} compact={compact} />
      ))}
    </div>
  );
}

export function CrmLeadTagsEditor({
  businessId,
  tags,
}: {
  businessId: string;
  tags: string[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveTags(nextTags: string[]) {
    setSaving(true);
    try {
      const res = await updateCrmLeadTags(businessId, nextTags);
      if (res.success) router.refresh();
      else alert(res.error);
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd() {
    const trimmed = draft.trim();
    if (!trimmed || saving) return;
    const exists = tags.some((t) => t.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setDraft("");
      return;
    }
    setDraft("");
    await saveTags([...tags, trimmed]);
  }

  async function handleRemove(tag: string) {
    if (saving) return;
    await saveTags(tags.filter((t) => t !== tag));
  }

  return (
    <section className="space-y-2">
      <h4 className="text-xs font-semibold uppercase text-muted-foreground">Tags</h4>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <CrmLeadTagBadge
              key={tag}
              tag={tag}
              onRemove={() => handleRemove(tag)}
              removing={saving}
            />
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleAdd();
            }
          }}
          placeholder="Add a tag..."
          className="h-9"
          disabled={saving}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void handleAdd()}
          disabled={!draft.trim() || saving}
          className="shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
