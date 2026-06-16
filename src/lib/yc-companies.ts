import type { TechLead } from "./tech-leads";
import { sanitizeCategory } from "./category";
import { readHttpError, sourceError, type SourceFetchResult } from "./source-fetch";

const YC_API = "https://yc-oss.github.io/api/companies/all.json";

type YcCompany = {
  id: number;
  name: string;
  slug: string;
  website?: string | null;
  one_liner?: string | null;
  industry?: string | null;
  subindustry?: string | null;
  tags?: string[] | null;
  status?: string | null;
  regions?: string[] | null;
};

let cachedCompanies: YcCompany[] | null = null;
let cacheTime = 0;
const CACHE_MS = 60 * 60 * 1000;

async function loadYcCompanies(): Promise<{ companies: YcCompany[]; error?: string }> {
  if (cachedCompanies && Date.now() - cacheTime < CACHE_MS) {
    return { companies: cachedCompanies };
  }

  try {
    const res = await fetch(YC_API, { next: { revalidate: 3600 } });
    if (!res.ok) {
      const error = await readHttpError(res, "YC companies");
      console.error("[yc]", error);
      return { companies: cachedCompanies ?? [], error };
    }

    const data = (await res.json()) as YcCompany[];
    cachedCompanies = Array.isArray(data) ? data : [];
    cacheTime = Date.now();
    return { companies: cachedCompanies };
  } catch (e) {
    const error = e instanceof Error ? e.message : "request failed";
    console.error("[yc]", error, e);
    return { companies: cachedCompanies ?? [], error: `YC: ${error}` };
  }
}

function matchesYcFilters(
  company: YcCompany,
  filters: { ycTags?: string[]; ycIndustries?: string[] }
): boolean {
  const tags = (company.tags ?? []).map((t) => t.toLowerCase());
  const industry = (company.industry ?? "").toLowerCase();
  const subindustry = (company.subindustry ?? "").toLowerCase();

  if (filters.ycTags?.length) {
    const hit = filters.ycTags.some((t) => tags.some((tag) => tag.includes(t.toLowerCase())));
    if (hit) return true;
  }

  if (filters.ycIndustries?.length) {
    const hit = filters.ycIndustries.some(
      (i) => industry.includes(i.toLowerCase()) || subindustry.includes(i.toLowerCase())
    );
    if (hit) return true;
  }

  return false;
}

export async function fetchYcByIndustry(
  industry: string,
  filters: { ycTags?: string[]; ycIndustries?: string[] },
  limit: number
): Promise<SourceFetchResult> {
  const { companies, error: loadError } = await loadYcCompanies();
  const leads: TechLead[] = [];

  for (const company of companies) {
    if (leads.length >= limit) break;
    if (company.status && company.status !== "Active") continue;
    if (!matchesYcFilters(company, filters)) continue;

    const website = company.website?.trim() || null;
    if (!website) continue;

    leads.push({
      externalId: `yc:${company.slug}`,
      name: company.name,
      website,
      address: company.regions?.join(", ") ?? null,
      email: null,
      phone: null,
      category: sanitizeCategory(company.one_liner ?? company.industry ?? "YC Company"),
      industry,
      reviews: 0,
      rating: null,
      source: "yc",
    });
  }

  if (loadError) {
    return { leads, error: sourceError("yc", loadError) };
  }

  return { leads };
}
