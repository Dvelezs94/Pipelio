"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronsUpDown, Loader2, Pencil, Plus } from "lucide-react";
import {
  addWorkspace,
  getActiveWorkspace,
  getWorkspaces,
  renameBusiness,
  switchWorkspace,
  type WorkspaceActionResult,
} from "@/app/actions/workspace";
import type { WorkspaceSummary } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renaming, setRenaming] = useState<WorkspaceSummary | null>(null);
  const [newName, setNewName] = useState("");
  const [renameName, setRenameName] = useState("");
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [active, setActive] = useState<WorkspaceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [list, current] = await Promise.all([getWorkspaces(), getActiveWorkspace()]);
    setWorkspaces(list);
    setActive(current);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function handleSwitch(id: string) {
    startTransition(async () => {
      const result = await switchWorkspace(id);
      if (result.success) {
        setActive(result.data ?? null);
        setOpen(false);
        router.refresh();
      }
    });
  }

  function handleCreate() {
    setCreateError(null);
    startTransition(async () => {
      const result: WorkspaceActionResult = await addWorkspace(newName);
      if (!result.success) {
        setCreateError(result.error);
        return;
      }
      setNewName("");
      setCreateOpen(false);
      setOpen(false);
      if (result.data) setActive(result.data);
      await refresh();
      router.refresh();
    });
  }

  function openRename(ws: WorkspaceSummary, e: React.MouseEvent) {
    e.stopPropagation();
    setRenaming(ws);
    setRenameName(ws.name);
    setRenameError(null);
    setRenameOpen(true);
  }

  function handleRename() {
    if (!renaming) return;
    setRenameError(null);
    startTransition(async () => {
      const result = await renameBusiness(renaming.id, renameName);
      if (!result.success) {
        setRenameError(result.error);
        return;
      }
      setRenameOpen(false);
      setRenaming(null);
      if (result.data && active?.id === result.data.id) {
        setActive(result.data);
      }
      await refresh();
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 max-w-[200px] shrink-0"
        onClick={() => setOpen(true)}
        title="Switch business"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
        ) : (
          <Building2 className="h-3.5 w-3.5 shrink-0" />
        )}
        <span className="truncate text-xs font-medium">{active?.name ?? "Business"}</span>
        <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Your businesses</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Each business has its own searches, database, CRM, and mail settings.
          </p>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {workspaces.map((ws) => {
              const isActive = ws.id === active?.id;
              return (
                <div
                  key={ws.id}
                  className={cn(
                    "flex items-center gap-1 rounded-lg transition-colors",
                    isActive ? "bg-muted" : "hover:bg-muted/60"
                  )}
                >
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => handleSwitch(ws.id)}
                    className={cn(
                      "flex-1 flex items-center gap-2 px-3 py-2 text-sm text-left min-w-0",
                      isActive && "font-medium"
                    )}
                  >
                    <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{ws.name}</span>
                    {isActive && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 mr-1"
                    title="Rename"
                    disabled={pending}
                    onClick={(e) => openRename(ws, e)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => {
                setCreateError(null);
                setCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              New business
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New business</DialogTitle>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Acme Corp, Solar Devs"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              }
            }}
          />
          {createError && <p className="text-sm text-destructive">{createError}</p>}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreate} disabled={pending || !newName.trim()}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={renameOpen}
        onOpenChange={(next) => {
          setRenameOpen(next);
          if (!next) setRenaming(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename business</DialogTitle>
          </DialogHeader>
          <Input
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            placeholder="Business name"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleRename();
              }
            }}
          />
          {renameError && <p className="text-sm text-destructive">{renameError}</p>}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleRename} disabled={pending || !renameName.trim()}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
