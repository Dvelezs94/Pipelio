"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateCrmLeadOrder, removeFromCrm } from "@/app/actions/crm";
import { Button } from "@/components/ui/button";
import type { CrmLeadRow } from "./CrmLeadsTable";
import type { LeadModalTab } from "./CrmLeadModal";
import { GripVertical, Trash2, FileText, Mail } from "lucide-react";
import { UnreadIndicator } from "./UnreadIndicator";
import { cn } from "@/lib/utils";
import { CrmLeadTagList } from "./CrmLeadTags";
import type { CrmPipelineColumnRow } from "@/app/actions/crm-pipeline";

type PipelineColumn = Pick<CrmPipelineColumnRow, "value" | "label">;

type DragPayload = { businessId: string; crmLeadId: string };

function LeadCard({
  lead,
  isDragPreview,
  onOpenLead,
  onRemove,
  onDragStart,
  onDragEnd,
}: {
  lead: CrmLeadRow;
  isDragPreview?: boolean;
  onOpenLead: (lead: CrmLeadRow, tab?: LeadModalTab) => void;
  onRemove: () => void;
  onDragStart: (e: React.DragEvent, payload: DragPayload, cardEl: HTMLElement | null) => void;
  onDragEnd: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const noteCount = lead.noteList?.length ?? 0;

  return (
    <div
      ref={cardRef}
      className={cn(
        "rounded-lg border bg-card p-3 shadow-sm transition-all duration-150",
        isDragPreview
          ? "border-primary ring-2 ring-primary/40 shadow-md scale-[1.02]"
          : "hover:border-primary/50"
      )}
    >
      <div className="flex items-start gap-2">
        <div
          draggable
          onDragStart={(e) =>
            onDragStart(e, { businessId: lead.businessId, crmLeadId: lead.id }, cardRef.current)
          }
          onDragEnd={onDragEnd}
          className="cursor-grab active:cursor-grabbing touch-none shrink-0 pt-0.5 text-muted-foreground hover:text-foreground"
          title="Drag to reorder or move"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onOpenLead(lead)}>
          <p className="font-medium text-sm truncate hover:text-primary hover:underline flex items-center gap-1.5">
            {lead.business.name}
            {(lead.unreadInboxCount ?? 0) > 0 && <UnreadIndicator count={lead.unreadInboxCount} compact />}
          </p>
          <p className="text-xs text-muted-foreground">
            {lead.business.industry ?? "—"} · Score {lead.business.leadScore ?? "—"}
          </p>
          <CrmLeadTagList tags={lead.tags ?? []} className="mt-1.5" compact />
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenLead(lead, "conversation");
                }}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Mail className="h-3 w-3" />
                Email
                {(lead.unreadInboxCount ?? 0) > 0 && (
                  <UnreadIndicator count={lead.unreadInboxCount} className="ml-0.5" />
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenLead(lead, "notes");
                }}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <FileText className="h-3 w-3" />
                {noteCount === 0 ? "Add notes" : `${noteCount} note${noteCount !== 1 ? "s" : ""}`}
              </button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              title="Remove from CRM"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DropSlot({
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
        "flex-shrink-0 transition-all duration-150 rounded",
        isDragging ? (isActive ? "h-3 py-0.5" : "h-2") : "h-0.5 -my-px"
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

function sortLeadsInColumn(leads: CrmLeadRow[]) {
  return [...leads].sort((a, b) => {
    const ao = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const bo = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

function getPreviewColumnLeads(
  leads: CrmLeadRow[],
  columnId: string,
  draggingLead: CrmLeadRow | null,
  dropTarget: { columnId: string; index: number } | null
): CrmLeadRow[] {
  const sorted = sortLeadsInColumn(leads.filter((l) => l.status === columnId));

  if (!draggingLead) return sorted;

  const without = sorted.filter((l) => l.id !== draggingLead.id);

  if (!dropTarget) {
    return draggingLead.status === columnId ? without : sorted;
  }

  if (dropTarget.columnId !== columnId) {
    return draggingLead.status === columnId ? without : sorted;
  }

  let insertAt = dropTarget.index;
  if (draggingLead.status === columnId) {
    const fromIdx = sorted.findIndex((l) => l.id === draggingLead.id);
    if (fromIdx !== -1 && fromIdx < insertAt) insertAt -= 1;
  }
  insertAt = Math.max(0, Math.min(insertAt, without.length));
  return [...without.slice(0, insertAt), draggingLead, ...without.slice(insertAt)];
}

function reorderLeadsLocal(
  leads: CrmLeadRow[],
  businessId: string,
  targetStatus: string,
  targetIndex: number
): CrmLeadRow[] {
  const moving = leads.find((l) => l.businessId === businessId);
  if (!moving) return leads;

  const rest = leads.filter((l) => l.businessId !== businessId);
  const targetColumn = sortLeadsInColumn(rest.filter((l) => l.status === targetStatus));
  const insertAt = Math.max(0, Math.min(targetIndex, targetColumn.length));
  targetColumn.splice(insertAt, 0, { ...moving, status: targetStatus });

  const withNewSort = targetColumn.map((l, i) => ({ ...l, sortOrder: i * 10 }));
  const otherStatuses = rest.filter((l) => l.status !== targetStatus);
  return [...otherStatuses, ...withNewSort];
}

export function CrmCanvas({
  leads,
  columns,
  onOpenLead,
}: {
  leads: CrmLeadRow[];
  columns: PipelineColumn[];
  onOpenLead: (lead: CrmLeadRow, tab?: LeadModalTab) => void;
}) {
  const router = useRouter();
  const [localLeads, setLocalLeads] = useState(leads);
  const [dropTarget, setDropTarget] = useState<{ columnId: string; index: number } | null>(null);
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [hoverColumnId, setHoverColumnId] = useState<string | null>(null);
  const dragPayloadRef = useRef<DragPayload | null>(null);

  useEffect(() => {
    setLocalLeads(leads);
  }, [leads]);

  const draggingLead = draggingLeadId
    ? localLeads.find((l) => l.id === draggingLeadId) ?? null
    : null;

  const byStatus = columns.map((col) => ({
    id: col.value,
    label: col.label,
    leads: getPreviewColumnLeads(localLeads, col.value, draggingLead, dropTarget),
  }));

  function handleDragStart(
    e: React.DragEvent,
    payload: DragPayload,
    cardEl: HTMLElement | null
  ) {
    dragPayloadRef.current = payload;
    setDraggingLeadId(payload.crmLeadId);
    const json = JSON.stringify(payload);
    e.dataTransfer.setData("text/plain", json);
    e.dataTransfer.effectAllowed = "move";

    if (cardEl) {
      const rect = cardEl.getBoundingClientRect();
      const clone = cardEl.cloneNode(true) as HTMLElement;
      clone.style.position = "fixed";
      clone.style.top = "-9999px";
      clone.style.left = "-9999px";
      clone.style.width = `${rect.width}px`;
      clone.style.opacity = "0.95";
      clone.style.pointerEvents = "none";
      clone.style.boxShadow = "0 12px 28px rgba(0,0,0,0.22)";
      clone.style.borderRadius = "0.5rem";
      document.body.appendChild(clone);
      e.dataTransfer.setDragImage(clone, rect.width / 2, 28);
      setTimeout(() => document.body.removeChild(clone), 0);
    }
  }

  function handleDragEnd() {
    dragPayloadRef.current = null;
    setDraggingLeadId(null);
    setDropTarget(null);
    setHoverColumnId(null);
  }

  function allowDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDragOver(e: React.DragEvent, columnId: string, index: number) {
    allowDrop(e);
    setDropTarget({ columnId, index });
    setHoverColumnId(columnId);
  }

  function readDragPayload(e: React.DragEvent): DragPayload | null {
    try {
      const raw = e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("application/json");
      if (raw) return JSON.parse(raw) as DragPayload;
    } catch {
      // fall through to ref
    }
    return dragPayloadRef.current;
  }

  async function handleDrop(e: React.DragEvent, columnId: string, index: number) {
    e.preventDefault();
    e.stopPropagation();

    const payload = readDragPayload(e);
    if (!payload?.businessId) {
      handleDragEnd();
      return;
    }

    const previous = localLeads;
    setLocalLeads((current) => reorderLeadsLocal(current, payload.businessId, columnId, index));
    handleDragEnd();

    const result = await updateCrmLeadOrder(payload.businessId, columnId, index);
    if (result.success) {
      router.refresh();
    } else {
      setLocalLeads(previous);
      alert(result.error);
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropTarget(null);
      setHoverColumnId(null);
    }
  }

  async function handleRemove(businessId: string) {
    const res = await removeFromCrm(businessId);
    if (res.success) router.refresh();
    else alert(res.error);
  }

  if (localLeads.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No leads yet. Run a search and click &quot;Save to CRM&quot; to add leads here.
      </p>
    );
  }

  const isDragging = draggingLeadId !== null;

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
      {byStatus.map((col) => (
        <div
          key={col.id}
          className={cn(
            "w-72 shrink-0 rounded-lg border bg-muted/30 min-h-[200px] flex flex-col transition-shadow",
            isDragging && hoverColumnId === col.id && "ring-2 ring-primary/40 shadow-md"
          )}
          onDragLeave={handleDragLeave}
        >
          <div className="p-3 border-b bg-muted/50 rounded-t-lg">
            <h3 className="font-semibold text-sm">
              {col.label}{" "}
              <span className="text-muted-foreground">
                ({sortLeadsInColumn(localLeads.filter((l) => l.status === col.id)).length})
              </span>
            </h3>
          </div>
          <div
            className="p-2 flex-1 flex flex-col gap-1 overflow-y-auto min-h-0"
            onDragOver={(e) => {
              allowDrop(e);
              setHoverColumnId(col.id);
              if (!dropTarget || dropTarget.columnId !== col.id) {
                setDropTarget({ columnId: col.id, index: col.leads.length });
              }
            }}
            onDrop={(e) => void handleDrop(e, col.id, col.leads.length)}
          >
            {col.leads.map((lead, i) => (
              <div key={lead.id}>
                <DropSlot
                  isActive={dropTarget?.columnId === col.id && dropTarget?.index === i}
                  isDragging={isDragging}
                  onDragOver={(e) => handleDragOver(e, col.id, i)}
                  onDrop={(e) => void handleDrop(e, col.id, i)}
                />
                <LeadCard
                  lead={lead}
                  isDragPreview={isDragging && draggingLeadId === lead.id}
                  onOpenLead={onOpenLead}
                  onRemove={() => handleRemove(lead.businessId)}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              </div>
            ))}
            <DropSlot
              isActive={dropTarget?.columnId === col.id && dropTarget?.index === col.leads.length}
              isDragging={isDragging}
              onDragOver={(e) => handleDragOver(e, col.id, col.leads.length)}
              onDrop={(e) => void handleDrop(e, col.id, col.leads.length)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
