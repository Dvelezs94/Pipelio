export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startInboxSyncScheduler } = await import("@/lib/inbox-sync-scheduler");
    startInboxSyncScheduler();
  }
}
