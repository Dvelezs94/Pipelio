"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  createWorkspace,
  getCurrentWorkspace,
  listWorkspaces,
  renameWorkspace,
  requireWorkspaceId,
  WORKSPACE_COOKIE,
  type WorkspaceSummary,
} from "@/lib/workspace";
import { getCurrentUser } from "@/lib/auth";
import { cookies } from "next/headers";

export type WorkspaceActionResult =
  | { success: true; data?: WorkspaceSummary }
  | { success: false; error: string };

export async function getWorkspaces(): Promise<WorkspaceSummary[]> {
  return listWorkspaces();
}

export async function getActiveWorkspace(): Promise<WorkspaceSummary> {
  return getCurrentWorkspace();
}

export async function switchWorkspace(workspaceId: string): Promise<WorkspaceActionResult> {
  try {
    const workspaces = await listWorkspaces();
    if (!workspaces.some((w) => w.id === workspaceId)) {
      return { success: false, error: "Business not found." };
    }
    const cookieStore = await cookies();
    cookieStore.set(WORKSPACE_COOKIE, workspaceId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    revalidatePath("/", "layout");
    revalidatePath("/db");
    revalidatePath("/crm");
    const ws = workspaces.find((w) => w.id === workspaceId)!;
    return { success: true, data: ws };
  } catch (e) {
    console.error("switchWorkspace", e);
    return { success: false, error: "Failed to switch business." };
  }
}

export async function addWorkspace(name: string): Promise<WorkspaceActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "You must be signed in." };
    const ws = await createWorkspace(name, user.id);
    const cookieStore = await cookies();
    cookieStore.set(WORKSPACE_COOKIE, ws.id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    revalidatePath("/", "layout");
    revalidatePath("/db");
    revalidatePath("/crm");
    return { success: true, data: ws };
  } catch (e) {
    console.error("addWorkspace", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create business.",
    };
  }
}

export async function getActiveWorkspaceId(): Promise<string> {
  return requireWorkspaceId();
}

export async function renameBusiness(
  workspaceId: string,
  name: string
): Promise<WorkspaceActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "You must be signed in." };
    const workspaces = await listWorkspaces();
    if (!workspaces.some((w) => w.id === workspaceId)) {
      return { success: false, error: "Business not found." };
    }
    await renameWorkspace(workspaceId, name, user.id);
    revalidatePath("/", "layout");
    revalidatePath("/db");
    revalidatePath("/crm");
    const updated = await prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      select: { id: true, name: true, slug: true },
    });
    return { success: true, data: updated };
  } catch (e) {
    console.error("renameBusiness", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to rename business.",
    };
  }
}
