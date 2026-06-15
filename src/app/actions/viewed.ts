"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireWorkspaceId } from "@/lib/workspace";

export type MarkViewedResult = { success: true } | { success: false; error: string };

/** Mark a business as viewed (user clicked website/LinkedIn/phone link). */
export async function markBusinessViewed(
  businessId: string,
  searchId?: string
): Promise<MarkViewedResult> {
  try {
    const workspaceId = await requireWorkspaceId();
    await prisma.business.updateMany({
      where: { id: businessId, workspaceId },
      data: { viewedAt: new Date() },
    });
    if (searchId) revalidatePath(`/results/${searchId}`);
    revalidatePath("/db");
    return { success: true };
  } catch (e) {
    console.error("markBusinessViewed", e);
    return { success: false, error: "Failed to mark as viewed." };
  }
}
