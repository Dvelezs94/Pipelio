"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createCrmPipelineColumn,
  deleteCrmPipelineColumn,
  reorderCrmPipelineColumns,
  updateCrmPipelineColumn,
  type CrmPipelineColumnRow,
} from "@/app/actions/crm-pipeline";
import { Columns3, GripVertical, Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

function reorderColumnsList(
  columns: CrmPipelineColumnRow[],
  value: string,
  targetIndex: number
): CrmPipelineColumnRow[] {
  const fromIdx = columns.findIndex((c) => c.value === value);
  if (fromIdx === -1) return columns;

  const next = [...columns];
  const [moved] = next.splice(fromIdx, 1);
  let insertAt = targetIndex;
  if (fromIdx < insertAt) insertAt -= 1;
  insertAt = Math.max(0, Math.min(insertAt, next.length));
  next.splice(insertAt, 0, moved);
  return next;
}

function getPreviewColumns(
  columns: CrmPipelineColumnRow[],
  draggingValue: string | null,
  dropIndex: number | null
): CrmPipelineColumnRow[] {
  if (!draggingValue || dropIndex === null) return columns;
  return reorderColumnsList(columns, draggingValue, dropIndex);
}

function RowDropSlot({
  isActive,
  isDragging,
  onDragOver,
  onDrop,
}: {
  isActive: boolean;
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  return (
    <div
      className={cn(
        "transition-all duration-150 rounded",
        isDragging ? (isActive ? "h-2 py-0.5" : "h-1.5") : "h-0.5 -my-px"
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {isActive && (
        <div className="h-0.5 w-full rounded-full bg-primary shadow-[0_0_6px_rgba(var(--primary),0.5)]" aria-hidden />
      )}
    </div>
  );
}

export function CrmColumnsDialog({ columns }: { columns: CrmPipelineColumnRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [orderedColumns, setOrderedColumns] = useState(columns);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newLabel, setNewLabel] = useState("");
  const [savingValue, setSavingValue] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingValue, setDeletingValue] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [draggingValue, setDraggingValue] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dragValueRef = useRef<string | null>(null);

  useEffect(() => {
    if (open) setOrderedColumns(columns);
  }, [columns, open]);

  const previewColumns = getPreviewColumns(orderedColumns, draggingValue, dropIndex);
  const isDragging = draggingValue !== null;

  function labelFor(col: CrmPipelineColumnRow) {
    return drafts[col.value] ?? col.label;
  }

  function setDraft(value: string, label: string) {
    setDrafts((prev) => ({ ...prev, [value]: label }));
  }

  function handleDragStart(e: React.DragEvent, value: string) {
    dragValueRef.current = value;
    setDraggingValue(value);
    e.dataTransfer.setData("text/plain", value);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd() {
    dragValueRef.current = null;
    setDraggingValue(null);
    setDropIndex(null);
  }

  function allowDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
  }

  async function persistOrder(next: CrmPipelineColumnRow[]) {
    setReordering(true);
    setError(null);
    try {
      const res = await reorderCrmPipelineColumns(next.map((c) => c.value));
      if (!res.success) {
        setError(res.error);
        setOrderedColumns(columns);
      } else {
        setOrderedColumns(next);
        router.refresh();
      }
    } finally {
      setReordering(false);
    }
  }

  async function handleDrop(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.stopPropagation();

    const value = dragValueRef.current ?? e.dataTransfer.getData("text/plain");
    if (!value) {
      handleDragEnd();
      return;
    }

    const next = reorderColumnsList(orderedColumns, value, index);
    handleDragEnd();

    const unchanged = next.every((col, i) => col.value === orderedColumns[i]?.value);
    if (unchanged) return;

    setOrderedColumns(next);
    await persistOrder(next);
  }

  async function handleRename(col: CrmPipelineColumnRow) {
    const next = labelFor(col).trim();
    if (!next || next === col.label) return;
    setSavingValue(col.value);
    setError(null);
    try {
      const res = await updateCrmPipelineColumn(col.value, next);
      if (!res.success) setError(res.error);
      else {
        setDrafts((prev) => {
          const copy = { ...prev };
          delete copy[col.value];
          return copy;
        });
        router.refresh();
      }
    } finally {
      setSavingValue(null);
    }
  }

  async function handleCreate() {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    setCreating(true);
    setError(null);
    try {
      const res = await createCrmPipelineColumn(trimmed);
      if (!res.success) setError(res.error);
      else {
        setNewLabel("");
        router.refresh();
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(col: CrmPipelineColumnRow) {
    if (col.leadCount > 0) return;
    if (!confirm(`Remove column "${col.label}"?`)) return;
    setDeletingValue(col.value);
    setError(null);
    try {
      const res = await deleteCrmPipelineColumn(col.value);
      if (!res.success) setError(res.error);
      else router.refresh();
    } finally {
      setDeletingValue(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <Columns3 className="h-4 w-4" />
          Columns
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pipeline columns</DialogTitle>
          <DialogDescription>
            Drag to reorder, rename, add, or remove canvas columns. Columns with leads cannot be removed.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-y-auto pr-1">
          {previewColumns.map((col, index) => {
            const dirty = labelFor(col).trim() !== col.label;
            const canDelete = col.leadCount === 0 && orderedColumns.length > 1;
            const isPreview = isDragging && draggingValue === col.value;
            return (
              <div key={col.value}>
                <RowDropSlot
                  isActive={dropIndex === index}
                  isDragging={isDragging}
                  onDragOver={(e) => {
                    allowDrop(e);
                    setDropIndex(index);
                  }}
                  onDrop={(e) => void handleDrop(e, index)}
                />
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-md transition-all",
                    isPreview && "opacity-60 ring-2 ring-primary/30"
                  )}
                >
                  <div
                    draggable={!reordering}
                    onDragStart={(e) => handleDragStart(e, col.value)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "cursor-grab active:cursor-grabbing touch-none shrink-0 text-muted-foreground hover:text-foreground",
                      reordering && "opacity-40 pointer-events-none"
                    )}
                    title="Drag to reorder"
                  >
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <Input
                    value={labelFor(col)}
                    onChange={(e) => setDraft(col.value, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleRename(col);
                    }}
                    className="h-9 flex-1"
                    disabled={reordering}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!dirty || savingValue === col.value || reordering}
                    onClick={() => void handleRename(col)}
                  >
                    {savingValue === col.value ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-40"
                    disabled={!canDelete || deletingValue === col.value || reordering}
                    title={
                      col.leadCount > 0
                        ? `${col.leadCount} lead${col.leadCount === 1 ? "" : "s"} in this column`
                        : orderedColumns.length <= 1
                          ? "Keep at least one column"
                          : "Remove column"
                    }
                    onClick={() => void handleDelete(col)}
                  >
                    {deletingValue === col.value ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
          <RowDropSlot
            isActive={dropIndex === previewColumns.length}
            isDragging={isDragging}
            onDragOver={(e) => {
              allowDrop(e);
              setDropIndex(previewColumns.length);
            }}
            onDrop={(e) => void handleDrop(e, previewColumns.length)}
          />
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreate();
            }}
            placeholder="New column name"
            className="h-9 flex-1"
            disabled={reordering}
          />
          <Button
            type="button"
            size="sm"
            className="gap-1"
            disabled={creating || !newLabel.trim() || reordering}
            onClick={() => void handleCreate()}
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </Button>
        </div>

        {reordering && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Saving order…
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
