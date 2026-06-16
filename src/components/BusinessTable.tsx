"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { BusinessRecord } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveToCrm } from "@/app/actions/crm";
import { dismissBusiness, undismissBusiness } from "@/app/actions/dismiss";
import { markBusinessViewed } from "@/app/actions/viewed";
import {
  readVisitedIds,
  persistVisitedIds,
  readLastVisitedId,
  persistLastVisitedId,
  pickLastVisitedFromBusinesses,
} from "@/hooks/useVisitedBusinesses";
import { ChevronLeft, ChevronRight, ExternalLink, Phone, Linkedin, UserPlus, Check, EyeOff, Eye } from "lucide-react";
import { ListingProfileLink } from "@/components/ListingSourceLinks";
import { BusinessDetailModal } from "@/components/BusinessDetailModal";

const PAGE_SIZES = [10, 25, 50, 100];
const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "industry", label: "Industry" },
  { value: "size", label: "Size" },
  { value: "rating", label: "Rating" },
  { value: "reviews", label: "Reviews" },
  { value: "leadScore", label: "Lead score" },
] as const;

export interface BusinessTableProps {
  businesses: BusinessRecord[];
  clientSide?: boolean;
  searchPlaceholder?: string;
  savedToCrmIds?: string[];
  onCrmChange?: () => void;
  onDismissChange?: () => void;
  /** Pass search id so viewed state is saved to the database */
  searchId?: string;
}

export function BusinessTable({
  businesses,
  clientSide = true,
  searchPlaceholder = "Search in table...",
  savedToCrmIds,
  onCrmChange,
  onDismissChange,
  searchId,
}: BusinessTableProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [detailBusiness, setDetailBusiness] = useState<BusinessRecord | null>(null);
  const [dismissedOverrides, setDismissedOverrides] = useState<Record<string, string | null>>({});
  const [visitedIds, setVisitedIds] = useState<Set<string>>(() => new Set());
  const [lastVisitedId, setLastVisitedId] = useState<string | null>(null);

  const savedSet = useMemo(() => new Set(savedToCrmIds ?? []), [savedToCrmIds]);

  useEffect(() => {
    const ids = new Set<string>(readVisitedIds());
    for (const b of businesses) {
      if (b.viewedAt) ids.add(b.id);
    }
    setVisitedIds(ids);

    const storedLast = readLastVisitedId();
    const dbLast = pickLastVisitedFromBusinesses(businesses);
    const last =
      storedLast && ids.has(storedLast) ? storedLast : dbLast ?? storedLast;
    setLastVisitedId(last);
  }, [businesses]);

  const isRowVisited = useCallback(
    (id: string) => visitedIds.has(id),
    [visitedIds]
  );

  const handleExternalLinkClick = useCallback(
    (businessId: string) => {
      setVisitedIds((prev) => {
        const next = new Set(prev);
        if (!next.has(businessId)) {
          next.add(businessId);
          persistVisitedIds([...next]);
        }
        return next;
      });
      setLastVisitedId(businessId);
      persistLastVisitedId(businessId);
      void markBusinessViewed(businessId, searchId);
    },
    [searchId]
  );

  const handleSaveToCrm = async (businessId: string) => {
    setSavingId(businessId);
    try {
      const res = await saveToCrm(businessId);
      if (res.success) onCrmChange?.();
      else alert(res.error);
    } finally {
      setSavingId(null);
    }
  };

  const handleDismiss = async (businessId: string, isDismissed: boolean) => {
    setDismissingId(businessId);
    const nextDismissedAt = isDismissed ? null : new Date().toISOString();
    try {
      const res = isDismissed ? await undismissBusiness(businessId) : await dismissBusiness(businessId);
      if (res.success) {
        setDismissedOverrides((prev) => ({ ...prev, [businessId]: nextDismissedAt }));
        onDismissChange?.();
      } else {
        alert(res.error);
      }
    } finally {
      setDismissingId(null);
    }
  };

  const dismissedAtFor = (b: BusinessRecord) =>
    dismissedOverrides[b.id] !== undefined ? dismissedOverrides[b.id] : b.dismissedAt ?? null;

  const filtered = useMemo(() => {
    if (!clientSide) return businesses;
    if (!search.trim()) return businesses;
    const q = search.toLowerCase().trim();
    return businesses.filter(
      (b) =>
        (b.name?.toLowerCase().includes(q)) ||
        (b.address?.toLowerCase().includes(q)) ||
        (b.industry?.toLowerCase().includes(q))
    );
  }, [businesses, search, clientSide]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let aVal: string | number | null = (a as unknown as Record<string, unknown>)[sortBy] as string | number | null;
      let bVal: string | number | null = (b as unknown as Record<string, unknown>)[sortBy] as string | number | null;
      if (aVal == null) aVal = sortOrder === "asc" ? "" : "zzz";
      if (bVal == null) bVal = sortOrder === "asc" ? "" : "zzz";
      if (typeof aVal === "number" && typeof bVal === "number")
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      const sa = String(aVal);
      const sb = String(bVal);
      return sortOrder === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
    return list;
  }, [filtered, sortBy, sortOrder]);

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageData = sorted.slice(start, start + pageSize);

  const toggleSort = (key: string) => {
    if (sortBy === key) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Input
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <Select
          value={sortBy}
          onValueChange={(v) => {
            setSortBy(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
        >
          {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
        </Button>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => {
            setPageSize(Number(v));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} per page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <table className="business-results-table w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th
                className="text-left p-3 font-medium cursor-pointer hover:bg-muted"
                onClick={() => toggleSort("name")}
              >
                Business Name
              </th>
              <th
                className="text-left p-3 font-medium cursor-pointer hover:bg-muted"
                onClick={() => toggleSort("industry")}
              >
                Industry
              </th>
              <th
                className="text-left p-3 font-medium cursor-pointer hover:bg-muted"
                onClick={() => toggleSort("size")}
              >
                Size
              </th>
              <th
                className="text-left p-3 font-medium cursor-pointer hover:bg-muted"
                onClick={() => toggleSort("rating")}
              >
                Rating
              </th>
              <th
                className="text-left p-3 font-medium cursor-pointer hover:bg-muted"
                onClick={() => toggleSort("reviews")}
              >
                Reviews
              </th>
              <th
                className="text-left p-3 font-medium cursor-pointer hover:bg-muted"
                onClick={() => toggleSort("leadScore")}
              >
                Lead score
              </th>
              <th className="text-left p-3 font-medium">Phone</th>
              <th className="text-left p-3 font-medium">Website</th>
              <th className="text-left p-3 font-medium">Listing profile</th>
              <th className="text-left p-3 font-medium">LinkedIn</th>
              <th className="text-left p-3 font-medium">Address</th>
              {savedToCrmIds !== undefined && (
                <th className="text-left p-3 font-medium">CRM</th>
              )}
              {onDismissChange !== undefined && (
                <th className="text-left p-3 font-medium">Dismiss</th>
              )}
            </tr>
          </thead>
          <tbody>
            {pageData.map((b) => {
              const visited = isRowVisited(b.id);
              const isLast = lastVisitedId === b.id;
              const dismissedAt = dismissedAtFor(b);
              return (
              <tr
                key={b.id}
                data-visited={visited ? "true" : "false"}
                data-last-visited={isLast ? "true" : "false"}
                data-dismissed={dismissedAt ? "true" : "false"}
                className="border-b"
              >
                <td className="p-3 font-medium">
                  <button
                    type="button"
                    onClick={() => setDetailBusiness(b)}
                    className="text-left hover:text-primary hover:underline cursor-pointer"
                  >
                    {b.name}
                  </button>
                </td>
                <td className="p-3 text-muted-foreground">{b.industry ?? "—"}</td>
                <td className="p-3">{b.size ?? "—"}</td>
                <td className="p-3">{b.rating != null ? `★ ${b.rating}` : "—"}</td>
                <td className="p-3">{b.reviews}</td>
                <td className="p-3">{b.leadScore != null ? b.leadScore : "—"}</td>
                <td className="p-3">
                  {b.phone ? (
                    <a
                      href={`tel:${b.phone}`}
                      className="flex items-center gap-1 text-primary hover:underline"
                      onPointerDown={() => handleExternalLinkClick(b.id)}
                    >
                      <Phone className="h-3 w-3" />
                      {b.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-3">
                  {b.website ? (
                    <a
                      href={b.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                      onPointerDown={() => handleExternalLinkClick(b.id)}
                    >
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
                    onPointerDown={() => handleExternalLinkClick(b.id)}
                  >
                    <Linkedin className="h-3 w-3" />
                    Search
                  </a>
                </td>
                <td className="p-3 text-muted-foreground max-w-[200px] truncate" title={b.address ?? ""}>
                  {b.address ?? "—"}
                </td>
                {savedToCrmIds !== undefined && (
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
                        {savingId === b.id ? (
                          <>Saving...</>
                        ) : (
                          <>
                            <UserPlus className="h-3 w-3" />
                            Save to CRM
                          </>
                        )}
                      </Button>
                    )}
                  </td>
                )}
                {onDismissChange !== undefined && (
                  <td className="p-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-muted-foreground hover:text-foreground"
                      disabled={dismissingId === b.id}
                      onClick={() => handleDismiss(b.id, !!dismissedAt)}
                      title={dismissedAt ? "Restore to list" : "Dismiss (grey out)"}
                    >
                      {dismissingId === b.id ? (
                        "..."
                      ) : dismissedAt ? (
                        <>
                          <Eye className="h-3 w-3" />
                          Undismiss
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3" />
                          Dismiss
                        </>
                      )}
                    </Button>
                  </td>
                )}
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {start + 1}–{Math.min(start + pageSize, sorted.length)} of {sorted.length}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <BusinessDetailModal
        business={
          detailBusiness
            ? { ...detailBusiness, dismissedAt: dismissedAtFor(detailBusiness) }
            : null
        }
        open={detailBusiness != null}
        onOpenChange={(open) => {
          if (!open) setDetailBusiness(null);
        }}
        savedToCrm={detailBusiness ? savedSet.has(detailBusiness.id) : false}
        savingToCrm={detailBusiness ? savingId === detailBusiness.id : false}
        onSaveToCrm={savedToCrmIds !== undefined ? handleSaveToCrm : undefined}
        dismissing={detailBusiness ? dismissingId === detailBusiness.id : false}
        onDismiss={onDismissChange !== undefined ? handleDismiss : undefined}
      />
    </div>
  );
}
