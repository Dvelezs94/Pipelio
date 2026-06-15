import { syncAllWorkspaceInboxes, syncInboxMessages } from "@/lib/imap";

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const STARTUP_DELAY_MS = 30_000;

let started = false;

/** Sync inbox for the active workspace (manual trigger). */
export async function runInboxSync(workspaceId?: string): Promise<number> {
  const result = workspaceId
    ? await syncInboxMessages(undefined, workspaceId)
    : await syncInboxMessages();
  if (!result.ok) {
    console.warn("[crm-inbox] background sync:", result.error);
    return 0;
  }
  if (result.imported > 0) {
    console.log(`[crm-inbox] imported ${result.imported} new message(s)`);
  }
  return result.imported;
}

/** Start periodic IMAP inbox sync for all workspaces while the Node server is running. */
export function startInboxSyncScheduler(): void {
  if (started) return;
  started = true;

  const intervalMs = Number(process.env.CRM_INBOX_SYNC_INTERVAL_MS) || DEFAULT_INTERVAL_MS;

  setTimeout(() => {
    void syncAllWorkspaceInboxes();
  }, STARTUP_DELAY_MS);

  setInterval(() => {
    void syncAllWorkspaceInboxes();
  }, intervalMs);

  console.log(`[crm-inbox] background sync every ${Math.round(intervalMs / 1000)}s (all businesses)`);
}
