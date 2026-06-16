import { prisma } from "@/lib/db";
import { sourceUrlFromPlaceId } from "@/lib/listing-source";
import {
  computeTechLeadScore,
  estimateTechSize,
  extractDomain,
  type TechLead,
} from "@/lib/tech-leads";

export const BROWSER_EXTENSION_SOURCES = [
  "clutch",
  "crunchbase",
  "g2",
  "capterra",
  "product_hunt",
  "yc",
  "wellfound",
  "goodfirms",
  "getapp",
  "software_advice",
  "builtin",
  "softwaresuggest",
  "github",
  "generic",
] as const;

export type BrowserExtensionSource = (typeof BROWSER_EXTENSION_SOURCES)[number];

export type ScrapedCompanyInput = {
  externalId?: string;
  name: string;
  website?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  category?: string | null;
  industry?: string | null;
  reviews?: number;
  rating?: number | null;
  profileUrl?: string | null;
  description?: string | null;
  hourlyRate?: string | null;
  minProjectSize?: string | null;
  employeeRange?: string | null;
};

export type ScraperImportInput = {
  workspaceId: string;
  source: string;
  pageUrl: string;
  searchLabel?: string;
  companies: ScrapedCompanyInput[];
};

export type ScraperImportResult = {
  imported: number;
  skipped: number;
  total: number;
  searchId: string;
};

export function extensionZipSearchId(workspaceId: string, source: string): string {
  const safe = source.replace(/[^a-z0-9_-]/gi, "-").slice(0, 40);
  return `browser-scraper-${safe}-${workspaceId}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function buildExternalId(source: string, company: ScrapedCompanyInput): string {
  if (company.externalId?.trim()) return `${source}:${company.externalId.trim()}`;
  if (company.profileUrl?.trim()) return `${source}:${company.profileUrl.trim()}`;
  if (company.website?.trim()) return `${source}:${company.website.trim()}`;
  return `${source}:name:${slugify(company.name)}`;
}

function toTechLead(source: string, company: ScrapedCompanyInput): TechLead | null {
  const name = company.name?.trim();
  if (!name) return null;

  return {
    externalId: buildExternalId(source, company),
    name,
    website: company.website?.trim() || null,
    address: company.address?.trim() || null,
    email: company.email?.trim() || null,
    phone: company.phone?.trim() || null,
    category: company.category?.trim() || null,
    industry: company.industry?.trim() || "SaaS / Software",
    reviews: Math.max(0, company.reviews ?? 0),
    rating: company.rating ?? null,
    source,
    description: company.description?.trim() || null,
    hourlyRate: company.hourlyRate?.trim() || null,
    minProjectSize: company.minProjectSize?.trim() || null,
    employeeRange: company.employeeRange?.trim() || null,
  };
}

async function ensureExtensionZipSearch(
  workspaceId: string,
  source: string,
  pageUrl: string,
  searchLabel?: string
): Promise<string> {
  const id = extensionZipSearchId(workspaceId, source);
  const label = searchLabel?.trim() || new URL(pageUrl).pathname.slice(0, 120) || source;

  await prisma.zipSearch.upsert({
    where: { id },
    create: {
      id,
      workspaceId,
      zipCode: "",
      industry: label.slice(0, 120),
      searchSource: `browser_extension:${source}`,
      searchQuery: pageUrl.slice(0, 500),
    },
    update: {
      searchQuery: pageUrl.slice(0, 500),
      industry: label.slice(0, 120),
    },
  });

  return id;
}

export async function importScrapedCompanies(
  input: ScraperImportInput
): Promise<ScraperImportResult> {
  const workspace = await prisma.workspace.findFirst({
    where: { id: input.workspaceId },
    select: { id: true },
  });
  if (!workspace) {
    throw new Error("Project not found.");
  }

  const source = input.source.trim() || "generic";
  const searchId = await ensureExtensionZipSearch(
    input.workspaceId,
    source,
    input.pageUrl,
    input.searchLabel
  );

  const rows: Array<{ lead: TechLead; profileUrl: string | null }> = [];
  const seen = new Set<string>();
  for (const company of input.companies) {
    const lead = toTechLead(source, company);
    if (!lead || seen.has(lead.externalId)) continue;
    seen.add(lead.externalId);
    rows.push({
      lead,
      profileUrl: company.profileUrl?.trim() || sourceUrlFromPlaceId(lead.externalId),
    });
  }

  if (rows.length === 0) {
    return { imported: 0, skipped: 0, total: 0, searchId };
  }

  const toCreate = rows.map(({ lead, profileUrl }) => {
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
      workspaceId: input.workspaceId,
      placeId: lead.externalId,
      name: lead.name,
      address: lead.address,
      phone: lead.phone,
      email: lead.email,
      website: lead.website,
      rating: lead.rating,
      reviews: lead.reviews,
      category: lead.category,
      industry: lead.industry,
      size,
      lat: null as number | null,
      lng: null as number | null,
      zipSearchId: searchId,
      domain: extractDomain(lead.website),
      leadScore,
      sourceUrl: profileUrl,
      description: lead.description?.trim() || null,
      hourlyRate: lead.hourlyRate?.trim() || null,
      minProjectSize: lead.minProjectSize?.trim() || null,
      employeeRange: lead.employeeRange?.trim() || null,
    };
  });

  const placeIds = [...new Set(toCreate.map((b) => b.placeId))];
  const existing = await prisma.business.findMany({
    where: { workspaceId: input.workspaceId, placeId: { in: placeIds } },
    select: { placeId: true },
  });
  const existingSet = new Set(existing.map((e) => e.placeId));
  const newRows = toCreate.filter((b) => !existingSet.has(b.placeId));

  if (newRows.length > 0) {
    await prisma.business.createMany({ data: newRows });
  }

  return {
    imported: newRows.length,
    skipped: toCreate.length - newRows.length,
    total: toCreate.length,
    searchId,
  };
}
