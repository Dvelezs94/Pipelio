import type { Industry } from "./constants";
import { INDUSTRY_SOURCE_CONFIG } from "./tech-industries";
import { fetchProductHuntByTopics } from "./product-hunt";
import { fetchYcByIndustry } from "./yc-companies";
import { fetchGitHubOrgsByKeywords } from "./github-orgs";
import { fetchClutchByCatalog } from "./clutch";
import type { SearchSourceId } from "./search-sources";
import { sourceError } from "./source-fetch";
import type { TechLead } from "./tech-leads";

export type IndustrySearchResult = {
  leads: TechLead[];
  sources: string[];
  sourceErrors: Partial<Record<SearchSourceId, string>>;
};

function dedupeLeads(leads: TechLead[]): TechLead[] {
  const byKey = new Map<string, TechLead>();

  for (const lead of leads) {
    const domainKey = lead.website
      ? lead.website
          .replace(/^https?:\/\//, "")
          .replace(/^www\./, "")
          .split("/")[0]
          .toLowerCase()
      : null;

    const key = domainKey ?? lead.externalId;
    const existing = byKey.get(key);
    if (!existing || lead.reviews > existing.reviews) {
      byKey.set(key, lead);
    }
  }

  return Array.from(byKey.values());
}

function recordSourceResult(
  sourceId: SearchSourceId,
  result: { leads: TechLead[]; error?: string },
  batches: TechLead[][],
  sources: string[],
  sourceErrors: Partial<Record<SearchSourceId, string>>
): void {
  if (result.error) sourceErrors[sourceId] = result.error;
  if (result.leads.length) {
    batches.push(result.leads);
    sources.push(sourceId);
  }
}

/**
 * Fetch companies for a tech industry from the selected data sources.
 */
export async function fetchLeadsForIndustry(
  industry: Industry,
  limit: number,
  selectedSources: SearchSourceId[]
): Promise<IndustrySearchResult> {
  const config = INDUSTRY_SOURCE_CONFIG[industry];
  const sourceSet = new Set(selectedSources);
  const sourceCount = selectedSources.length || 1;
  const perSource = Math.ceil(limit / sourceCount);
  const batches: TechLead[][] = [];
  const sources: string[] = [];
  const sourceErrors: Partial<Record<SearchSourceId, string>> = {};

  if (sourceSet.has("product_hunt")) {
    if (config.productHuntTopics?.length) {
      recordSourceResult(
        "product_hunt",
        await fetchProductHuntByTopics(config.productHuntTopics, industry, perSource),
        batches,
        sources,
        sourceErrors
      );
    } else {
      sourceErrors.product_hunt = sourceError("product_hunt", "No Product Hunt topics configured for this industry");
    }
  }

  if (sourceSet.has("yc")) {
    if (config.ycTags?.length || config.ycIndustries?.length) {
      recordSourceResult(
        "yc",
        await fetchYcByIndustry(
          industry,
          { ycTags: config.ycTags, ycIndustries: config.ycIndustries },
          perSource
        ),
        batches,
        sources,
        sourceErrors
      );
    } else {
      sourceErrors.yc = sourceError("yc", "No YC filters configured for this industry");
    }
  }

  if (sourceSet.has("github")) {
    if (config.githubKeywords?.length) {
      recordSourceResult(
        "github",
        await fetchGitHubOrgsByKeywords(config.githubKeywords, industry, perSource),
        batches,
        sources,
        sourceErrors
      );
    } else {
      sourceErrors.github = sourceError("github", "No GitHub keywords configured for this industry");
    }
  }

  if (sourceSet.has("clutch")) {
    if (config.clutchCatalogUrl) {
      recordSourceResult(
        "clutch",
        await fetchClutchByCatalog(config.clutchCatalogUrl, industry, perSource),
        batches,
        sources,
        sourceErrors
      );
    } else {
      sourceErrors.clutch = sourceError("clutch", "No Clutch catalog configured for this industry");
    }
  }

  const merged = dedupeLeads(batches.flat()).slice(0, limit);

  return {
    leads: merged,
    sources: [...new Set(sources)],
    sourceErrors,
  };
}
