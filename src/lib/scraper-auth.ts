import type { NextRequest } from "next/server";
import { authenticateScraperApiKey } from "@/lib/scraper-api-keys";

export const SCRAPER_KEY_HEADER = "x-scraper-key";
export const SCRAPER_WORKSPACE_HEADER = "x-workspace-id";

export type ScraperAuthContext = {
  userId: string;
  keyId: string;
};

export function getScraperKeyFromRequest(request: NextRequest): string | null {
  return request.headers.get(SCRAPER_KEY_HEADER);
}

export async function authenticateScraperRequest(
  request: NextRequest
): Promise<ScraperAuthContext | null> {
  const key = getScraperKeyFromRequest(request);
  const auth = await authenticateScraperApiKey(key);
  if (!auth) return null;
  return auth;
}
