"use server";

import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { requireWorkspaceId } from "@/lib/workspace";
import {
  RATE_LIMIT_SEARCHES_PER_MINUTE,
  DEFAULT_INDUSTRY_SEARCH_LIMIT,
  isIndustry,
  type Industry,
} from "@/lib/constants";
import { fetchLeadsForIndustry } from "@/lib/industry-search";
import { sanitizeCategory } from "@/lib/category";
import {
  DEFAULT_SEARCH_SOURCES,
  formatSourceKey,
  isSearchSource,
  formatSourcesLabel,
  type SearchSourceId,
} from "@/lib/search-sources";
import {
  computeTechLeadScore,
  estimateTechSize,
  extractDomain,
  type TechLead,
} from "@/lib/tech-leads";
import { revalidatePath } from "next/cache";

export type SearchResult =
  | { success: true; searchId: string; warnings?: string[] }
  | { success: false; error: string };

function formatSourceErrors(sourceErrors: Partial<Record<SearchSourceId, string>>): string[] {
  return Object.values(sourceErrors).filter((msg): msg is string => Boolean(msg));
}

async function processLeadsToBusinesses(
  workspaceId: string,
  searchId: string,
  leads: TechLead[]
): Promise<void> {
  const toCreate = leads.map((lead) => {
    const leadScore = computeTechLeadScore({
      website: lead.website,
      email: lead.email,
      reviews: lead.reviews,
    });
    const size = estimateTechSize({
      engagement: lead.reviews,
      name: lead.name,
      employeeRange: lead.employeeRange,
    });

    return {
      workspaceId,
      placeId: lead.externalId,
      name: lead.name,
      address: lead.address,
      phone: lead.phone,
      email: lead.email,
      website: lead.website,
      rating: lead.rating,
      reviews: lead.reviews,
      category: sanitizeCategory(lead.category),
      industry: lead.industry,
      size,
      lat: null as number | null,
      lng: null as number | null,
      zipSearchId: searchId,
      domain: extractDomain(lead.website),
      leadScore,
      description: lead.description?.trim() || null,
      hourlyRate: lead.hourlyRate?.trim() || null,
      minProjectSize: lead.minProjectSize?.trim() || null,
      employeeRange: lead.employeeRange?.trim() || null,
    };
  });

  if (toCreate.length === 0) return;

  const placeIds = [...new Set(toCreate.map((b) => b.placeId))];
  const existing = await prisma.business.findMany({
    where: { workspaceId, placeId: { in: placeIds } },
    select: { placeId: true },
  });
  const existingSet = new Set(existing.map((e) => e.placeId));
  const newRows = toCreate.filter((b) => !existingSet.has(b.placeId));

  if (newRows.length > 0) {
    await prisma.business.createMany({ data: newRows });
  }
}

/**
 * Search companies by internet/tech industry (SaaS, E-commerce, etc.)
 * using Product Hunt, YC, and GitHub.
 */
export async function searchByIndustry(
  industry: string,
  options?: { rateLimitKey?: string; limit?: number; sources?: SearchSourceId[] }
): Promise<SearchResult> {
  const rateLimitKey = options?.rateLimitKey ?? "anonymous";
  if (!rateLimit(rateLimitKey, RATE_LIMIT_SEARCHES_PER_MINUTE)) {
    return { success: false, error: "Too many searches. Please try again in a minute." };
  }

  const trimmed = industry.trim();
  if (!trimmed) return { success: false, error: "Industry is required." };
  if (!isIndustry(trimmed)) {
    return { success: false, error: `Unknown industry: ${trimmed}` };
  }

  const limit = options?.limit ?? DEFAULT_INDUSTRY_SEARCH_LIMIT;
  const workspaceId = await requireWorkspaceId();

  const sources = (options?.sources?.length ? options.sources : DEFAULT_SEARCH_SOURCES).filter(
    isSearchSource
  );
  if (sources.length === 0) {
    return { success: false, error: "Select at least one data source." };
  }

  const sourceKey = formatSourceKey(sources);

  const existing = await prisma.zipSearch.findFirst({
    where: { workspaceId, industry: trimmed, searchQuery: sourceKey },
    orderBy: { createdAt: "desc" },
    include: { businesses: true },
  });
  if (existing && existing.businesses.length > 0) {
    const ageMinutes = (Date.now() - existing.createdAt.getTime()) / 60_000;
    if (ageMinutes < 60) {
      revalidatePath("/");
      revalidatePath(`/results/${existing.id}`);
      return { success: true, searchId: existing.id };
    }
  }

  const { leads, sources: usedSources, sourceErrors } = await fetchLeadsForIndustry(
    trimmed as Industry,
    limit,
    sources
  );

  const errorMessages = formatSourceErrors(sourceErrors);

  if (leads.length === 0) {
    const missing: string[] = [];
    if (sources.includes("product_hunt") && !process.env.PRODUCT_HUNT_TOKEN?.trim() && !sourceErrors.product_hunt) {
      missing.push("PRODUCT_HUNT_TOKEN");
    }
    if (sources.includes("github") && !process.env.GITHUB_TOKEN?.trim() && !sourceErrors.github) {
      missing.push("GITHUB_TOKEN (recommended)");
    }
    if (sources.includes("clutch") && !process.env.APIFY_TOKEN?.trim() && !sourceErrors.clutch) {
      missing.push("APIFY_TOKEN (for Clutch via Apify)");
    }

    const parts: string[] = [];
    if (errorMessages.length) parts.push(...errorMessages);
    if (missing.length) {
      parts.push(`Missing .env keys: ${missing.join(", ")}. YC works without keys.`);
    }
    if (parts.length === 0) {
      parts.push("No companies found for this industry and source selection. Try other sources.");
    }
    return { success: false, error: parts.join("\n") };
  }

  const searchSource = usedSources.length > 1 ? "mixed" : usedSources[0] ?? "mixed";
  const warnings = errorMessages.length ? errorMessages : undefined;

  const search = await prisma.zipSearch.create({
    data: {
      workspaceId,
      zipCode: "",
      countryCode: "",
      lat: 0,
      lng: 0,
      radius: 0,
      industry: trimmed,
      searchSource,
      searchQuery: sourceKey,
    },
  });

  await processLeadsToBusinesses(workspaceId, search.id, leads);

  revalidatePath("/");
  revalidatePath(`/results/${search.id}`);
  return { success: true, searchId: search.id, warnings };
}


export type RecentSearchItem = {
  id: string;
  label: string;
  detail: string;
  createdAt: string;
  businessCount: number;
};

function formatSearchLabel(search: {
  industry: string | null;
  searchQuery: string | null;
  zipCode: string;
  radius: number;
  searchSource: string | null;
}): string {
  if (search.industry) return search.industry;
  if (search.searchQuery) return search.searchQuery;
  if (search.zipCode.trim()) {
    const km = search.radius > 0 ? ` · ${search.radius / 1000} km` : "";
    return `${search.zipCode}${km}`;
  }
  return "Search";
}

/** Last N searches for the home page. */
export async function getRecentSearches(limit = 5): Promise<RecentSearchItem[]> {
  const workspaceId = await requireWorkspaceId();
  const searches = await prisma.zipSearch.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { _count: { select: { businesses: true } } },
  });

  return searches.map((s) => {
    const label = formatSearchLabel(s);
    const source = formatSourcesLabel(s.searchQuery, s.searchSource);
    const detail = [
      `${s._count.businesses} companies`,
      source,
      new Date(s.createdAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    ]
      .filter(Boolean)
      .join(" · ");

    return {
      id: s.id,
      label,
      detail,
      createdAt: s.createdAt.toISOString(),
      businessCount: s._count.businesses,
    };
  });
}
