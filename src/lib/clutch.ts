import type { TechLead } from "./tech-leads";
import { readHttpError, sourceError, type SourceFetchResult } from "./source-fetch";

const APIFY_ACTOR = "curious_coder~clutch-scraper";
const APIFY_TIMEOUT_MS = 120_000;

export type ClutchFetchResult = SourceFetchResult;

type ApifyClutchItem = {
  title?: string;
  name?: string;
  website?: string;
  rating?: string | number;
  reviews?: string | number;
  reviewCount?: string | number;
  location?: string;
  url?: string;
  clutchUrl?: string;
  profileUrl?: string;
  tagline?: string;
  summary?: string;
  minProjectSize?: string;
  hourlyRate?: string;
  employeeCount?: string;
  phone?: string | string[];
};

function parseNumber(value: string | number | undefined): number {
  if (value == null) return 0;
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function slugFromProfileUrl(url: string | undefined): string | null {
  if (!url) return null;
  const match = url.match(/clutch\.co\/profile\/([^/?#]+)/i);
  return match?.[1] ?? null;
}

function mapClutchItem(item: ApifyClutchItem, industry: string): TechLead | null {
  const name = item.title?.trim() || item.name?.trim();
  if (!name) return null;

  const rawProfile = item.clutchUrl?.trim() || item.url?.trim() || item.profileUrl?.trim() || null;
  const profileUrl = rawProfile?.startsWith("http")
    ? rawProfile
    : rawProfile
      ? `https://clutch.co${rawProfile.startsWith("/") ? "" : "/"}${rawProfile}`
      : null;
  const slug = slugFromProfileUrl(profileUrl ?? undefined);
  const externalId = slug ? `clutch:${slug}` : `clutch:${name.toLowerCase().replace(/\s+/g, "-")}`;

  const website = item.website?.trim() || null;
  const reviews = parseNumber(item.reviews ?? item.reviewCount);
  const ratingRaw = parseNumber(item.rating);
  const phone = Array.isArray(item.phone) ? item.phone[0]?.trim() || null : item.phone?.trim() || null;
  const description = item.summary?.trim() || item.tagline?.trim() || null;
  const category = item.tagline?.trim() || "Clutch listing";

  return {
    externalId,
    name,
    website,
    address: item.location?.trim() || null,
    email: null,
    phone,
    category,
    industry,
    reviews,
    rating: ratingRaw > 0 ? ratingRaw : null,
    source: "clutch",
    description,
    hourlyRate: item.hourlyRate?.trim() || null,
    minProjectSize: item.minProjectSize?.trim() || null,
    employeeRange: item.employeeCount?.trim() || null,
  };
}

async function formatApifyError(res: Response): Promise<string> {
  return readHttpError(res, "Apify");
}

/**
 * Fetch agencies from a Clutch catalog URL via Apify (Clutch blocks direct scraping).
 * Requires APIFY_TOKEN in .env — https://apify.com/curious_coder/clutch-scraper
 */
export async function fetchClutchByCatalog(
  catalogUrl: string,
  industry: string,
  limit: number
): Promise<ClutchFetchResult> {
  const token = process.env.APIFY_TOKEN?.trim();
  if (!token) {
    return { leads: [], error: sourceError("clutch", "APIFY_TOKEN is not set in .env") };
  }

  const endpoint = `https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "scrapeCompanies.url": catalogUrl,
        count: Math.min(limit, 50),
        scrapeCompanyPages: false,
        useBrowser: true,
      }),
      signal: AbortSignal.timeout(APIFY_TIMEOUT_MS),
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const error = await formatApifyError(res);
      console.error("[clutch]", error);
      return { leads: [], error: sourceError("clutch", error) };
    }

    const items = (await res.json()) as ApifyClutchItem[];
    if (!Array.isArray(items)) {
      return {
        leads: [],
        error: sourceError("clutch", "Apify returned an unexpected response (not an array)"),
      };
    }

    const leads: TechLead[] = [];
    const seen = new Set<string>();

    for (const item of items) {
      const lead = mapClutchItem(item, industry);
      if (!lead || seen.has(lead.externalId)) continue;
      seen.add(lead.externalId);
      leads.push(lead);
      if (leads.length >= limit) break;
    }

    return { leads };
  } catch (e) {
    const message =
      e instanceof Error && e.name === "TimeoutError"
        ? `Apify request timed out after ${APIFY_TIMEOUT_MS / 1000}s`
        : e instanceof Error
          ? e.message
          : "fetch failed";
    console.error("[clutch]", message, e);
    return { leads: [], error: sourceError("clutch", message) };
  }
}
