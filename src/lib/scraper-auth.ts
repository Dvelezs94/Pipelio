import type { NextRequest } from "next/server";

export const SCRAPER_KEY_HEADER = "x-scraper-key";
export const SCRAPER_WORKSPACE_HEADER = "x-workspace-id";

export function getScraperApiKey(): string | null {
  const key = process.env.SCRAPER_API_KEY?.trim();
  return key || null;
}

export function isValidScraperKey(key: string | null | undefined): boolean {
  const expected = getScraperApiKey();
  if (!expected || !key) return false;
  return key === expected;
}

export function getScraperKeyFromRequest(request: NextRequest): string | null {
  return request.headers.get(SCRAPER_KEY_HEADER);
}

export function isScraperAuthorized(request: NextRequest): boolean {
  return isValidScraperKey(getScraperKeyFromRequest(request));
}
