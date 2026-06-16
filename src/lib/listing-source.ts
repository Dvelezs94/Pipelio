/** Labels for browser-extension scrape sources (Clutch, G2, etc.). */
export const EXTENSION_SOURCE_LABELS: Record<string, string> = {
  clutch: "Clutch",
  crunchbase: "Crunchbase",
  g2: "G2",
  capterra: "Capterra",
  product_hunt: "Product Hunt",
  yc: "Y Combinator",
  wellfound: "Wellfound",
  goodfirms: "GoodFirms",
  getapp: "GetApp",
  software_advice: "Software Advice",
  builtin: "Built In",
  softwaresuggest: "SoftwareSuggest",
  github: "GitHub",
  generic: "Listing",
};

export function extensionSourceKey(searchSource: string | null | undefined): string | null {
  if (!searchSource?.startsWith("browser_extension:")) return null;
  return searchSource.slice("browser_extension:".length) || null;
}

export function listingSiteLabelFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    if (host.includes("clutch.co")) return "Clutch";
    if (host.includes("g2.com")) return "G2";
    if (host.includes("crunchbase.com")) return "Crunchbase";
    if (host.includes("capterra.com")) return "Capterra";
    if (host.includes("producthunt.com")) return "Product Hunt";
    if (host.includes("ycombinator.com")) return "Y Combinator";
    if (host.includes("wellfound.com") || host.includes("angel.co")) return "Wellfound";
    if (host.includes("goodfirms.co")) return "GoodFirms";
    if (host.includes("getapp.com")) return "GetApp";
    if (host.includes("softwareadvice.com")) return "Software Advice";
    if (host.includes("builtin.com")) return "Built In";
    if (host.includes("softwaresuggest.com")) return "SoftwareSuggest";
    if (host.includes("github.com")) return "GitHub";
    return host;
  } catch {
    return "Listing";
  }
}

/** Extract profile URL embedded in extension placeId (`clutch:https://…`). */
export function sourceUrlFromPlaceId(placeId: string | null | undefined): string | null {
  if (!placeId) return null;
  const idx = placeId.indexOf(":");
  if (idx === -1) return null;
  const rest = placeId.slice(idx + 1);
  if (rest.startsWith("http://") || rest.startsWith("https://")) return rest;
  return null;
}

export function resolveBusinessSourceUrl(business: {
  sourceUrl?: string | null;
  placeId?: string | null;
}): string | null {
  const direct = business.sourceUrl?.trim();
  if (direct) return direct;
  return sourceUrlFromPlaceId(business.placeId);
}

export function sourceLabelForBusiness(business: {
  sourceUrl?: string | null;
  placeId?: string | null;
  zipSearch?: { searchSource?: string | null } | null;
}): string {
  const url = resolveBusinessSourceUrl(business);
  if (url) return listingSiteLabelFromUrl(url);
  const extKey = extensionSourceKey(business.zipSearch?.searchSource);
  if (extKey) return EXTENSION_SOURCE_LABELS[extKey] ?? extKey;
  if (business.placeId?.includes(":")) {
    const prefix = business.placeId.split(":")[0];
    return EXTENSION_SOURCE_LABELS[prefix] ?? prefix;
  }
  return "Listing";
}
