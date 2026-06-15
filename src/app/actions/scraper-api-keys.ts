"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  createScraperApiKey,
  listScraperApiKeys,
  revokeScraperApiKey,
  type ScraperApiKeySummary,
} from "@/lib/scraper-api-keys";

export type ScraperKeyActionResult =
  | { success: true; data?: unknown }
  | { success: false; error: string };

export async function getScraperApiKeys(): Promise<ScraperApiKeySummary[]> {
  const user = await requireUser();
  return listScraperApiKeys(user.id);
}

export async function createUserScraperApiKey(
  name: string
): Promise<
  ScraperKeyActionResult & { data?: { id: string; key: string; keyPrefix: string } }
> {
  try {
    const user = await requireUser();
    const created = await createScraperApiKey(user.id, name);
    revalidatePath("/settings/extension");
    return { success: true, data: created };
  } catch (e) {
    console.error("createUserScraperApiKey", e);
    return { success: false, error: "Failed to create API key." };
  }
}

export async function revokeUserScraperApiKey(keyId: string): Promise<ScraperKeyActionResult> {
  try {
    const user = await requireUser();
    const ok = await revokeScraperApiKey(user.id, keyId);
    if (!ok) return { success: false, error: "API key not found." };
    revalidatePath("/settings/extension");
    return { success: true };
  } catch (e) {
    console.error("revokeUserScraperApiKey", e);
    return { success: false, error: "Failed to revoke API key." };
  }
}
