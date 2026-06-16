"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireWorkspaceId } from "@/lib/workspace";

export type DismissResult = { success: true } | { success: false; error: string };

/** Hide a business from default views (soft dismiss). */
export async function dismissBusiness(businessId: string): Promise<DismissResult> {
  try {
    const workspaceId = await requireWorkspaceId();
    await prisma.business.updateMany({
      where: { id: businessId, workspaceId },
      data: { dismissedAt: new Date() },
    });
    revalidatePath("/db");
    revalidatePath("/");
    revalidatePath("/results", "layout");
    return { success: true };
  } catch (e) {
    console.error("dismissBusiness", e);
    return { success: false, error: "Failed to dismiss." };
  }
}

/** Show a dismissed business again. */
export async function undismissBusiness(businessId: string): Promise<DismissResult> {
  try {
    const workspaceId = await requireWorkspaceId();
    await prisma.business.updateMany({
      where: { id: businessId, workspaceId },
      data: { dismissedAt: null },
    });
    revalidatePath("/db");
    revalidatePath("/");
    revalidatePath("/results", "layout");
    return { success: true };
  } catch (e) {
    console.error("undismissBusiness", e);
    return { success: false, error: "Failed to restore." };
  }
}
