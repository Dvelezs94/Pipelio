"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { getCrmLeadIds } from "@/app/actions/crm";
import { saveToCrm } from "@/app/actions/crm";
import { dismissBusiness, undismissBusiness } from "@/app/actions/dismiss";
import { INDUSTRIES, SIZES } from "@/lib/constants";
import {
  Database as DatabaseIcon,
  ExternalLink,
  Phone,
  Linkedin,
  UserPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  EyeOff,
  Eye,
} from "lucide-react";
import { ListingProfileLink, ListingSearchOrigin } from "@/components/ListingSourceLinks";

type ZipSearchRef = {
  id: string;
  zipCode: string;
  countryCode: string;
  searchSource?: string | null;
  searchQuery?: string | null;
};
type BusinessRow = {
  id: string;
  name: string;
  placeId?: string;
  sourceUrl?: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  size: string | null;
  rating: number | null;
  reviews: number;
  leadScore: number | null;
  dismissedAt: string | null;
  zipSearch?: ZipSearchRef;
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function buildApiUrl(params: {
  page: number;
  limit: number;
  search: string;
  industry: string;
  size: string;
  minRating: string;
  hasWebsite: "any" | "true" | "false";
  hasPhone: boolean;
  includeDismissed: boolean;
  excludeInCrm: boolean;
  sortBy: string;
  sortOrder: string;
}): string {
  const u = new URL("/api/businesses", typeof window !== "undefined" ? window.location.origin : "");
  u.searchParams.set("includeZipSearch", "true");
  u.searchParams.set("page", String(params.page));
  u.searchParams.set("limit", String(params.limit));
  u.searchParams.set("sortBy", params.sortBy);
  u.searchParams.set("sortOrder", params.sortOrder);
  if (params.search.trim()) u.searchParams.set("search", params.search.trim());
  if (params.industry && params.industry !== "__any__") u.searchParams.set("industry", params.industry);
  if (params.size && params.size !== "__any__") u.searchParams.set("size", params.size);
  if (params.minRating) u.searchParams.set("minRating", params.minRating);
  if (params.hasWebsite && params.hasWebsite !== "any") u.searchParams.set("hasWebsite", params.hasWebsite);
  if (params.hasPhone) u.searchParams.set("hasPhone", "true");
  if (params.includeDismissed) u.searchParams.set("includeDismissed", "true");
  if (params.excludeInCrm) u.searchParams.set("excludeInCrm", "true");
  return u.toString();
}

export function DatabaseView() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("__any__");
  const [size, setSize] = useState("__any__");
  const [minRating, setMinRating] = useState("");
  const [hasWebsite, setHasWebsite] = useState<"any" | "true" | "false">("any");
  const [hasPhone, setHasPhone] = useState(false);
  const [includeDismissed, setIncludeDismissed] = useState(false);
  const [excludeInCrm, setExcludeInCrm] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [crmLeadIds, setCrmLeadIds] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const apiParams = {
    page,
    limit,
    search,
    industry,
    size,
    minRating,
    hasWebsite,
    hasPhone,
    includeDismissed,
    excludeInCrm,
    sortBy,
    sortOrder,
  };
  const apiUrl = buildApiUrl(apiParams);

  const { data, mutate } = useSWR<{ businesses: BusinessRow[]; pagination: Pagination }>(
    ["/api/businesses", page, limit, search, industry, size, minRating, hasWebsite, hasPhone, includeDismissed, excludeInCrm, sortBy, sortOrder],
    () => fetcher(apiUrl)
  );

  useEffect(() => {
    getCrmLeadIds().then(setCrmLeadIds);
  }, []);

  const handleSaveToCrm = useCallback(async (businessId: string) => {
    setSavingId(businessId);
    try {
      const res = await saveToCrm(businessId);
      if (res.success) {
        setCrmLeadIds((prev) => (prev.includes(businessId) ? prev : [...prev, businessId]));
      } else {
        alert(res.error);
      }
    } finally {
      setSavingId(null);
    }
  }, []);

  const handleDismiss = useCallback(async (businessId: string, isDismissed: boolean) => {
    setDismissingId(businessId);
    try {
      const res = isDismissed ? await undismissBusiness(businessId) : await dismissBusiness(businessId);
      if (res.success) mutate();
      else alert(res.error);
    } finally {
      setDismissingId(null);
    }
  }, [mutate]);

  const businesses = data?.businesses ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: 25, total: 0, totalPages: 0 };
  const totalPages = Math.max(1, pagination.totalPages);
  const savedSet = new Set(crmLeadIds);

  const applyFilters = () => {
    setPage(1);
    mutate();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <DatabaseIcon className="h-6 w-6 text-muted-foreground" />
            <div>
              <h1 className="text-xl font-semibold text-foreground">Database</h1>
              <p className="text-sm text-muted-foreground">
                All companies from previous searches ({pagination.total} total)
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <CardDescription>Filter and search across all saved businesses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">Search by business name</label>
                <Input
                  placeholder="Business name, address, or industry..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                  className="w-56"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">Industry</label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any__">Any</SelectItem>
                    {INDUSTRIES.map((i) => (
                      <SelectItem key={i} value={i}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">Size</label>
                <Select value={size} onValueChange={setSize}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any__">Any</SelectItem>
                    {SIZES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">Min rating</label>
                <Input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  placeholder="Any"
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value)}
                  className="w-20"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">Has website</label>
                <Select value={hasWebsite} onValueChange={(v) => setHasWebsite(v as "any" | "true" | "false")}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={hasPhone} onCheckedChange={(c) => setHasPhone(!!c)} />
                  Has phone
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={includeDismissed} onCheckedChange={(c) => setIncludeDismissed(!!c)} />
                  Show dismissed
                </label>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={excludeInCrm}
                    onCheckedChange={(c) => {
                      setExcludeInCrm(!!c);
                      setPage(1);
                    }}
                  />
                  Hide saved to CRM
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="industry">Industry</SelectItem>
                    <SelectItem value="size">Size</SelectItem>
                    <SelectItem value="rating">Rating</SelectItem>
                    <SelectItem value="leadScore">Lead score</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}>
                  {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
                </Button>
              </div>
              <Button onClick={applyFilters}>Apply</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Companies</CardTitle>
            <CardDescription>
              Page {pagination.page} of {totalPages} · {limit} per page
            </CardDescription>
          </CardHeader>
          <CardContent>
            {businesses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No businesses yet. Run a search from the Search page to add companies to the database.
              </p>
            ) : (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Business</th>
                        <th className="text-left p-3 font-medium">Industry</th>
                        <th className="text-left p-3 font-medium">Size</th>
                        <th className="text-left p-3 font-medium">Rating</th>
                        <th className="text-left p-3 font-medium">Lead score</th>
                        <th className="text-left p-3 font-medium">Phone</th>
                        <th className="text-left p-3 font-medium">Website</th>
                        <th className="text-left p-3 font-medium">Listing profile</th>
                        <th className="text-left p-3 font-medium">LinkedIn</th>
                        <th className="text-left p-3 font-medium">From search</th>
                        <th className="text-left p-3 font-medium">CRM</th>
                        <th className="text-left p-3 font-medium">Dismiss</th>
                      </tr>
                    </thead>
                    <tbody>
                      {businesses.map((b) => (
                        <tr key={b.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-medium">{b.name}</td>
                          <td className="p-3 text-muted-foreground">{b.industry ?? "—"}</td>
                          <td className="p-3">{b.size ?? "—"}</td>
                          <td className="p-3">{b.rating != null ? `★ ${b.rating}` : "—"}</td>
                          <td className="p-3">{b.leadScore ?? "—"}</td>
                          <td className="p-3">
                            {b.phone ? (
                              <a href={`tel:${b.phone}`} className="flex items-center gap-1 text-primary hover:underline">
                                <Phone className="h-3 w-3" />
                                {b.phone}
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="p-3">
                            {b.website ? (
                              <a href={b.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                                <ExternalLink className="h-3 w-3" />
                                Link
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="p-3">
                            <ListingProfileLink business={b} />
                          </td>
                          <td className="p-3">
                            <a
                              href={`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(b.name)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-primary hover:underline"
                              title="Search on LinkedIn"
                            >
                              <Linkedin className="h-3 w-3" />
                              Search
                            </a>
                          </td>
                          <td className="p-3">
                            {b.zipSearch?.zipCode && !b.zipSearch.searchSource?.startsWith("browser_extension:") ? (
                              <Link href={`/results/${b.zipSearch.id}`} className="text-primary hover:underline">
                                {b.zipSearch.zipCode} ({b.zipSearch.countryCode})
                              </Link>
                            ) : (
                              <ListingSearchOrigin zipSearch={b.zipSearch} />
                            )}
                          </td>
                          <td className="p-3">
                            {savedSet.has(b.id) ? (
                              <Link href="/crm">
                                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                                  <Check className="h-3 w-3" />
                                  In CRM
                                </Button>
                              </Link>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                disabled={savingId === b.id}
                                onClick={() => handleSaveToCrm(b.id)}
                              >
                                {savingId === b.id ? "Saving..." : <><UserPlus className="h-3 w-3" /> Save to CRM</>}
                              </Button>
                            )}
                          </td>
                          <td className="p-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-muted-foreground hover:text-foreground"
                              disabled={dismissingId === b.id}
                              onClick={() => handleDismiss(b.id, !!b.dismissedAt)}
                              title={b.dismissedAt ? "Show again" : "Hide from list"}
                            >
                              {dismissingId === b.id ? "..." : b.dismissedAt ? <><Eye className="h-3 w-3" /> Undismiss</> : <><EyeOff className="h-3 w-3" /> Dismiss</>}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <Select
                      value={String(limit)}
                      onValueChange={(v) => {
                        setLimit(Number(v));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[10, 25, 50, 100].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} per page
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">
                      Showing {(pagination.page - 1) * pagination.limit + 1}–
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                    disabled={pagination.page <= 1 || totalPages <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {pagination.page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={pagination.page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
