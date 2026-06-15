import { NextResponse } from "next/server";
import { runInboxSync } from "@/lib/inbox-sync-scheduler";
import { prisma } from "@/lib/db";
import { requireWorkspaceId } from "@/lib/workspace";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const workspaceId = await requireWorkspaceId();
    const imported = await runInboxSync(workspaceId);
    const row = await prisma.smtpConfig.findUnique({
      where: { workspaceId },
      select: { inboxLastSyncedAt: true },
    });
    if (imported > 0) {
      revalidatePath("/crm");
    }
    return NextResponse.json({
      ok: true,
      imported,
      lastSyncedAt: row?.inboxLastSyncedAt?.toISOString() ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Inbox sync failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
