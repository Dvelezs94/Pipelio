"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn, formatRelativeTime } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

const AUTO_SYNC_MS = 3 * 60 * 1000;
const LABEL_TICK_MS = 1000;

type SyncResponse = {
  ok?: boolean;
  imported?: number;
  lastSyncedAt?: string | null;
  error?: string;
};

export function CrmInboxSyncButton({ initialLastSyncedAt }: { initialLastSyncedAt: string | null }) {
  const router = useRouter();
  const syncingRef = useRef(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(initialLastSyncedAt);
  const [syncing, setSyncing] = useState(false);
  const [statusText, setStatusText] = useState(
    initialLastSyncedAt ? "Last sync …" : "Not synced yet"
  );

  useEffect(() => {
    function updateStatus() {
      setStatusText(
        lastSyncedAt ? `Last sync ${formatRelativeTime(lastSyncedAt)}` : "Not synced yet"
      );
    }
    updateStatus();
    const id = setInterval(updateStatus, LABEL_TICK_MS);
    return () => clearInterval(id);
  }, [lastSyncedAt]);

  const sync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const res = await fetch("/api/crm/sync-inbox", { method: "POST" });
      const data = (await res.json()) as SyncResponse;
      if (data.lastSyncedAt) {
        setLastSyncedAt(data.lastSyncedAt);
      }
      if (data.ok && (data.imported ?? 0) > 0) {
        router.refresh();
      }
    } catch {
      // best-effort background sync
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [router]);

  useEffect(() => {
    void sync();
    const id = setInterval(() => void sync(), AUTO_SYNC_MS);
    return () => clearInterval(id);
  }, [sync]);

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => void sync()} disabled={syncing}>
        <RefreshCw className={cn("h-4 w-4 mr-1.5", syncing && "animate-spin")} />
        Sync inbox
      </Button>
      <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
        {statusText}
      </span>
    </div>
  );
}
