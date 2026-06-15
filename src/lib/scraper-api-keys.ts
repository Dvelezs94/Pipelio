import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";

const KEY_PREFIX = "plk_";

export type ScraperApiKeySummary = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
};

export function hashScraperApiKey(key: string): string {
  return createHash("sha256").update(key.trim()).digest("hex");
}

export function generateScraperApiKeyValue(): string {
  return `${KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
}

export function isScraperApiKeyFormat(key: string): boolean {
  return key.startsWith(KEY_PREFIX) && key.length >= 20;
}

export async function createScraperApiKey(
  userId: string,
  name: string
): Promise<{ id: string; key: string; keyPrefix: string }> {
  const trimmedName = name.trim() || "Browser extension";
  const key = generateScraperApiKeyValue();
  const keyHash = hashScraperApiKey(key);
  const keyPrefix = key.slice(0, 12);

  const row = await prisma.scraperApiKey.create({
    data: {
      userId,
      name: trimmedName,
      keyPrefix,
      keyHash,
    },
    select: { id: true, keyPrefix: true },
  });

  return { id: row.id, key, keyPrefix: row.keyPrefix };
}

export async function listScraperApiKeys(userId: string): Promise<ScraperApiKeySummary[]> {
  return prisma.scraperApiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });
}

export async function revokeScraperApiKey(userId: string, keyId: string): Promise<boolean> {
  const hit = await prisma.scraperApiKey.findFirst({
    where: { id: keyId, userId },
    select: { id: true },
  });
  if (!hit) return false;
  await prisma.scraperApiKey.delete({ where: { id: keyId } });
  return true;
}

export async function authenticateScraperApiKey(
  rawKey: string | null | undefined
): Promise<{ userId: string; keyId: string } | null> {
  if (!rawKey?.trim() || !isScraperApiKeyFormat(rawKey)) return null;

  const keyHash = hashScraperApiKey(rawKey);
  const hit = await prisma.scraperApiKey.findUnique({
    where: { keyHash },
    select: { id: true, userId: true },
  });
  if (!hit) return null;

  await prisma.scraperApiKey
    .update({
      where: { id: hit.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return { userId: hit.userId, keyId: hit.id };
}

export async function listWorkspacesForScraperUser(userId: string) {
  return prisma.workspace.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, slug: true },
  });
}

export async function resolveWorkspaceForScraperUser(
  userId: string,
  workspaceId: string | null | undefined
): Promise<string | null> {
  if (!workspaceId?.trim()) return null;
  const hit = await prisma.workspace.findFirst({
    where: { id: workspaceId.trim(), userId },
    select: { id: true },
  });
  return hit?.id ?? null;
}
