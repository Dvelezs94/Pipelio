"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { FiltersPanel, DEFAULT_FILTERS, type FiltersState } from "@/components/FiltersPanel";
import { IndustryAccordion } from "@/components/IndustryAccordion";
import { BusinessTable } from "@/components/BusinessTable";
import { MapView } from "@/components/MapView";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BusinessRecord } from "@/types";
import { ArrowLeft, Download, Map, Table, LayoutList, AlertTriangle } from "lucide-react";
import { getExportCsv, getExportJson } from "./actions";
import { markBusinessViewed } from "@/app/actions/viewed";
import {
  useVisitedBusinesses,
  visitedItemClasses,
  pickLastVisitedFromBusinesses,
} from "@/hooks/useVisitedBusinesses";
import { cn } from "@/lib/utils";
import { formatSourcesLabel } from "@/lib/search-sources";
import { ListingProfileLink, ListingSearchOrigin } from "@/components/ListingSourceLinks";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export interface ResultsDashboardProps {
  searchId: string;
  /** Industry searched (e.g. "SaaS") */
  industry?: string;
  /** Data sources used: product_hunt, yc, github, mixed */
  searchSource?: string;
  zipCode: string;
  /** Legacy text search query */
  searchQuery?: string;
  radius: number;
  center?: { lat: number; lng: number };
  initialBusinesses: Array<{
    id: string;
    placeId: string;
    name: string;
    address: string | null;
    phone: string | null;
    website: string | null;
    rating: number | null;
    reviews: number;
    category: string | null;
    industry: string | null;
    size: string | null;
    lat: number | null;
    lng: number | null;
    domain: string | null;
    leadScore: number | null;
    dismissedAt: string | null;
    viewedAt: string | null;
    sourceUrl?: string | null;
  }>;
  initialCrmLeadIds: string[];
  mapApiKey: string;
}

function toRecord(b: ResultsDashboardProps["initialBusinesses"][0]): BusinessRecord {
  return {
    id: b.id,
    placeId: b.placeId,
    name: b.name,
    address: b.address,
    phone: b.phone,
    website: b.website,
    rating: b.rating,
    reviews: b.reviews,
    category: b.category,
    industry: b.industry,
    size: b.size,
    lat: b.lat,
    lng: b.lng,
    domain: b.domain,
    leadScore: b.leadScore,
    dismissedAt: b.dismissedAt ?? undefined,
    viewedAt: b.viewedAt ?? undefined,
    sourceUrl: b.sourceUrl ?? undefined,
  };
}


export function ResultsDashboard({
  searchId,
  industry,
  searchSource,
  zipCode,
  searchQuery,
  radius,
  center,
  initialBusinesses,
  initialCrmLeadIds,
  mapApiKey,
}: ResultsDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceWarnings = searchParams.get("warnings");
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);
  const [view, setView] = useState<"accordion" | "table" | "map">("table");
  const [exporting, setExporting] = useState<"csv" | "json" | null>(null);
  const {
    markVisited: markVisitedLocal,
    isVisited: isVisitedLocal,
    lastVisitedId: lastVisitedStored,
  } = useVisitedBusinesses();

  const { data } = useSWR(`/api/search/${searchId}`, fetcher, {
    fallbackData: {
      businesses: initialBusinesses,
      id: searchId,
      zipCode,
      searchQuery: searchQuery ?? null,
      radius,
      lat: center?.lat,
      lng: center?.lng,
    },
    revalidateOnFocus: false,
  });

  const businesses: BusinessRecord[] = (data?.businesses ?? initialBusinesses).map(toRecord);
  const hasMapData = businesses.some((b) => b.lat != null && b.lng != null);

  const lastVisitedId =
    lastVisitedStored ?? pickLastVisitedFromBusinesses(businesses);

  const isVisited = useCallback(
    (id: string) => isVisitedLocal(id) || !!businesses.find((b) => b.id === id)?.viewedAt,
    [isVisitedLocal, businesses]
  );

  const isLastVisited = useCallback(
    (id: string) => lastVisitedId === id,
    [lastVisitedId]
  );

  const markVisited = useCallback(
    (id: string) => {
      markVisitedLocal(id);
      void markBusinessViewed(id, searchId);
    },
    [markVisitedLocal, searchId]
  );

  const filtered = useMemo(() => {
    let list = businesses;
    if (!filters.showDismissed) list = list.filter((b) => !b.dismissedAt);
    if (filters.industry) list = list.filter((b) => b.industry === filters.industry);
    if (filters.size) list = list.filter((b) => b.size === filters.size);
    if (filters.minRating) {
      const r = parseFloat(filters.minRating);
      if (!Number.isNaN(r)) list = list.filter((b) => (b.rating ?? 0) >= r);
    }
    if (filters.hasWebsite === "true") list = list.filter((b) => !!b.website);
    if (filters.hasWebsite === "false") list = list.filter((b) => !b.website);
    if (filters.hasPhone) list = list.filter((b) => !!b.phone);
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(
        (b) =>
          (b.name?.toLowerCase().includes(q)) ||
          (b.address?.toLowerCase().includes(q)) ||
          (b.industry?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [businesses, filters]);

  const title = industry ?? searchQuery ?? (zipCode || "Search");
  const sourcesLabel = formatSourcesLabel(searchQuery, searchSource);
  const subtitle = industry
    ? `${filtered.length} companies · ${sourcesLabel ?? "multiple sources"}`
    : searchQuery
      ? `${filtered.length} businesses`
      : `Radius: ${radius / 1000} km · ${filtered.length} businesses`;

  const handleExport = async (format: "csv" | "json") => {
    setExporting(format);
    try {
      const content = format === "csv" ? await getExportCsv(searchId) : await getExportJson(searchId);
      const blob = new Blob([content], { type: format === "csv" ? "text/csv" : "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `businesses-${((searchQuery ?? zipCode) || "search").replace(/[^a-z0-9-_]/gi, "_")}-${format === "csv" ? "export.csv" : "export.json"}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" type="button" className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Results: {title}</h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
              {searchSource?.startsWith("browser_extension:") && searchQuery?.startsWith("http") && (
                <p className="text-sm mt-1">
                  <span className="text-muted-foreground">Listing page: </span>
                  <ListingSearchOrigin
                    zipSearch={{ id: searchId, zipCode, countryCode: "US", searchSource, searchQuery }}
                  />
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("csv")}
              disabled={!!exporting}
            >
              <Download className="h-4 w-4 mr-1" />
              {exporting === "csv" ? "..." : "CSV"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("json")}
              disabled={!!exporting}
            >
              <Download className="h-4 w-4 mr-1" />
              {exporting === "json" ? "..." : "JSON"}
            </Button>
          </div>
        </div>
      </header>

      {sourceWarnings && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <div className="container mx-auto flex gap-2 text-sm text-amber-950 dark:text-amber-100">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0 whitespace-pre-wrap">
              <p className="font-medium">Some data sources failed</p>
              <p className="text-amber-900/80 dark:text-amber-100/80">{sourceWarnings}</p>
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1">
            <FiltersPanel
              filters={filters}
              onFiltersChange={setFilters}
              onReset={() => setFilters(DEFAULT_FILTERS)}
            />
          </aside>

          <div className="lg:col-span-3 space-y-6">
            <div className="flex gap-2">
              <Button
                variant={view === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("table")}
              >
                <Table className="h-4 w-4 mr-1" />
                Table
              </Button>
              <Button
                variant={view === "accordion" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("accordion")}
              >
                <LayoutList className="h-4 w-4 mr-1" />
                By industry
              </Button>
              {hasMapData && mapApiKey && (
                <Button
                  variant={view === "map" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setView("map")}
                >
                  <Map className="h-4 w-4 mr-1" />
                  Map
                </Button>
              )}
            </div>

            {view === "table" && (
              <Card>
                <CardHeader>
                  <CardTitle>Businesses</CardTitle>
                </CardHeader>
                <CardContent>
                  <BusinessTable
                    businesses={filtered}
                    searchPlaceholder="Search in results..."
                    savedToCrmIds={initialCrmLeadIds}
                    searchId={searchId}
                    onCrmChange={() => router.refresh()}
                    onDismissChange={() => router.refresh()}
                  />
                </CardContent>
              </Card>
            )}

            {view === "accordion" && (
              <Card>
                <CardHeader>
                  <CardTitle>By industry & size</CardTitle>
                </CardHeader>
                <CardContent>
                  <IndustryAccordion
                    businesses={filtered}
                    renderBusiness={(b) => (
                      <div
                        className={cn(
                          "flex items-center justify-between gap-2 py-1 px-2 rounded-md border-l-[3px]",
                          visitedItemClasses(isVisited(b.id), isLastVisited(b.id))
                        )}
                      >
                        <span>{b.name}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <ListingProfileLink business={b} />
                          {b.website && (
                            <a
                              href={b.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary text-sm hover:underline"
                              onPointerDown={() => markVisited(b.id)}
                            >
                              Website
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {view === "map" && hasMapData && mapApiKey && (
              <Card>
                <CardHeader>
                  <CardTitle>Map</CardTitle>
                  <CardDescription>Click a marker for details</CardDescription>
                </CardHeader>
                <CardContent>
                  <MapView
                    businesses={filtered}
                    center={center}
                    apiKey={mapApiKey}
                    className="rounded-md overflow-hidden"
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
