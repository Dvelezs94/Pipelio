export const SEARCH_SOURCES = [
  {
    id: "product_hunt",
    label: "Product Hunt",
    hint: "Needs PRODUCT_HUNT_TOKEN",
  },
  {
    id: "yc",
    label: "Y Combinator",
    hint: "No API key required",
  },
  {
    id: "github",
    label: "GitHub",
    hint: "GITHUB_TOKEN recommended",
  },
  {
    id: "clutch",
    label: "Clutch",
    hint: "Needs APIFY_TOKEN (Apify scraper)",
  },
] as const;

export type SearchSourceId = (typeof SEARCH_SOURCES)[number]["id"];

const SOURCE_SET = new Set<string>(SEARCH_SOURCES.map((s) => s.id));

export function isSearchSource(value: string): value is SearchSourceId {
  return SOURCE_SET.has(value);
}

export const DEFAULT_SEARCH_SOURCES: SearchSourceId[] = SEARCH_SOURCES.map((s) => s.id);

export const SOURCE_LABELS: Record<string, string> = {
  product_hunt: "Product Hunt",
  yc: "Y Combinator",
  github: "GitHub",
  clutch: "Clutch",
  browser_extension: "Browser extension",
  mixed: "Mixed sources",
};

export function formatSourceKey(sources: SearchSourceId[]): string {
  return [...sources].sort().join(",");
}

export function parseSourceKey(key: string | null | undefined): SearchSourceId[] | null {
  if (!key?.trim()) return null;
  const parts = key.split(",").map((p) => p.trim());
  if (!parts.every(isSearchSource)) return null;
  return parts;
}

export function formatSourcesLabel(
  searchQuery: string | null | undefined,
  searchSource: string | null | undefined
): string | null {
  const fromQuery = parseSourceKey(searchQuery);
  if (fromQuery?.length) {
    return fromQuery.map((s) => SOURCE_LABELS[s] ?? s).join(", ");
  }
  if (searchSource) return SOURCE_LABELS[searchSource] ?? searchSource;
  return null;
}
