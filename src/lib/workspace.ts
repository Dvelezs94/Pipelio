import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { seedDefaultPipelineColumns } from "@/lib/crm-pipeline";

export const WORKSPACE_COOKIE = "workspace-id";

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
};

export function manualZipSearchId(workspaceId: string): string {
  return `crm-manual-import-${workspaceId}`;
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "workspace";
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let n = 0;
  while (await prisma.workspace.findUnique({ where: { slug }, select: { id: true } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

/** Ensure at least one workspace exists for the given user. */
export async function ensureDefaultWorkspace(userId: string): Promise<WorkspaceSummary> {
  const existing = await prisma.workspace.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, slug: true },
  });
  if (existing) return existing;

  const ws = await prisma.workspace.create({
    data: { name: "Default", slug: await uniqueSlug("default"), userId },
    select: { id: true, name: true, slug: true },
  });
  await seedWorkspaceDefaults(ws.id);
  return ws;
}

async function seedWorkspaceDefaults(workspaceId: string): Promise<void> {
  await prisma.smtpConfig.upsert({
    where: { workspaceId },
    create: { workspaceId },
    update: {},
  });
  await prisma.proposalSender.upsert({
    where: { workspaceId },
    create: { workspaceId },
    update: {},
  });
  await ensureManualZipSearch(workspaceId);
  await seedDefaultPipelineColumns(workspaceId);
}

export async function ensureManualZipSearch(workspaceId: string): Promise<void> {
  const id = manualZipSearchId(workspaceId);
  await prisma.zipSearch.upsert({
    where: { id },
    create: {
      id,
      workspaceId,
      zipCode: "",
      industry: "Manual",
      searchSource: "manual",
    },
    update: {},
  });
}

export async function listWorkspaces(): Promise<WorkspaceSummary[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  await ensureDefaultWorkspace(user.id);
  return prisma.workspace.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, slug: true },
  });
}

export async function resolveWorkspaceId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(WORKSPACE_COOKIE)?.value;
  if (fromCookie) {
    const hit = await prisma.workspace.findFirst({
      where: { id: fromCookie, userId: user.id },
      select: { id: true },
    });
    if (hit) return hit.id;
  }
  const ws = await ensureDefaultWorkspace(user.id);
  return ws.id;
}

export async function requireWorkspaceId(): Promise<string> {
  return resolveWorkspaceId();
}

export async function getCurrentWorkspace(): Promise<WorkspaceSummary> {
  const id = await resolveWorkspaceId();
  return prisma.workspace.findUniqueOrThrow({
    where: { id },
    select: { id: true, name: true, slug: true },
  });
}

export async function createWorkspace(name: string, userId: string): Promise<WorkspaceSummary> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Business name is required.");

  const slug = await uniqueSlug(slugify(trimmed));
  const ws = await prisma.workspace.create({
    data: { name: trimmed, slug, userId },
    select: { id: true, name: true, slug: true },
  });
  await seedWorkspaceDefaults(ws.id);
  return ws;
}

export async function renameWorkspace(workspaceId: string, name: string, userId: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Business name is required.");
  const hit = await prisma.workspace.findFirst({
    where: { id: workspaceId, userId },
    select: { id: true },
  });
  if (!hit) throw new Error("Business not found.");
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { name: trimmed },
  });
}
