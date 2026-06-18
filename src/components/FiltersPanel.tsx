"use client";

import type { ReactNode } from "react";
import { INDUSTRIES, SIZES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export type HasWebsiteFilter = "any" | "true" | "false";

export interface FiltersState {
  industry: string;
  size: string;
  minRating: string;
  hasWebsite: HasWebsiteFilter;
  hasPhone: boolean;
  search: string;
  /** When true, hide dismissed businesses from the list (they stay visible but greyed by default) */
  hideDismissed: boolean;
}

const DEFAULT_FILTERS: FiltersState = {
  industry: "",
  size: "",
  minRating: "",
  hasWebsite: "any",
  hasPhone: false,
  search: "",
  hideDismissed: false,
};

export interface FiltersPanelProps {
  filters: FiltersState;
  onFiltersChange: (f: FiltersState) => void;
  onReset?: () => void;
  layout?: "stacked" | "horizontal";
}

function FilterField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-sm font-medium text-muted-foreground block mb-1">{label}</label>
      {children}
    </div>
  );
}

export function FiltersPanel({
  filters,
  onFiltersChange,
  onReset,
  layout = "horizontal",
}: FiltersPanelProps) {
  const update = (patch: Partial<FiltersState>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  const horizontal = layout === "horizontal";

  const searchField = (
    <FilterField label="Search by business name">
      <Input
        placeholder="Business name, address, or industry..."
        value={filters.search}
        onChange={(e) => update({ search: e.target.value })}
        className={horizontal ? "w-56" : "mt-1"}
      />
    </FilterField>
  );

  const industryField = (
    <FilterField label="Industry">
      <Select
        value={filters.industry || "all"}
        onValueChange={(v) => update({ industry: v === "all" ? "" : v })}
      >
        <SelectTrigger className={horizontal ? "w-40" : "mt-1"}>
          <SelectValue placeholder="All industries" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All industries</SelectItem>
          {INDUSTRIES.map((ind) => (
            <SelectItem key={ind} value={ind}>
              {ind}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FilterField>
  );

  const sizeField = (
    <FilterField label="Size">
      <Select value={filters.size || "all"} onValueChange={(v) => update({ size: v === "all" ? "" : v })}>
        <SelectTrigger className={horizontal ? "w-32" : "mt-1"}>
          <SelectValue placeholder="All sizes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sizes</SelectItem>
          {SIZES.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FilterField>
  );

  const ratingField = (
    <FilterField label="Min rating">
      <Select
        value={filters.minRating || "any"}
        onValueChange={(v) => update({ minRating: v === "any" ? "" : v })}
      >
        <SelectTrigger className={horizontal ? "w-24" : "mt-1"}>
          <SelectValue placeholder="Any" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any</SelectItem>
          <SelectItem value="3">3+</SelectItem>
          <SelectItem value="3.5">3.5+</SelectItem>
          <SelectItem value="4">4+</SelectItem>
          <SelectItem value="4.5">4.5+</SelectItem>
        </SelectContent>
      </Select>
    </FilterField>
  );

  const websiteField = (
    <FilterField label="Has website">
      <Select
        value={filters.hasWebsite}
        onValueChange={(v) => update({ hasWebsite: v as FiltersState["hasWebsite"] })}
      >
        <SelectTrigger className={horizontal ? "w-24" : "mt-1"}>
          <SelectValue placeholder="Any" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any</SelectItem>
          <SelectItem value="true">Yes</SelectItem>
          <SelectItem value="false">No</SelectItem>
        </SelectContent>
      </Select>
    </FilterField>
  );

  const checkboxFields = horizontal ? (
    <div className="flex items-center gap-4 pb-0.5">
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={filters.hasPhone} onCheckedChange={(c) => update({ hasPhone: !!c })} />
        Has phone
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={filters.hideDismissed}
          onCheckedChange={(c) => update({ hideDismissed: !!c })}
        />
        Hide dismissed
      </label>
    </div>
  ) : (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-muted-foreground">Contact info</label>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="has-phone"
          checked={filters.hasPhone}
          onCheckedChange={(c) => update({ hasPhone: !!c })}
        />
        <label htmlFor="has-phone" className="text-sm">
          Has phone
        </label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="hide-dismissed"
          checked={filters.hideDismissed}
          onCheckedChange={(c) => update({ hideDismissed: !!c })}
        />
        <label htmlFor="hide-dismissed" className="text-sm">
          Hide dismissed
        </label>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filters
        </CardTitle>
        {horizontal && (
          <CardDescription>Filter and search within these results</CardDescription>
        )}
      </CardHeader>
      <CardContent className={cn("space-y-4", horizontal && "space-y-0")}>
        {horizontal ? (
          <div className="flex flex-wrap items-end gap-4">
            {searchField}
            {industryField}
            {sizeField}
            {ratingField}
            {websiteField}
            {checkboxFields}
            {onReset && (
              <Button variant="outline" onClick={onReset}>
                Reset
              </Button>
            )}
          </div>
        ) : (
          <>
            {searchField}
            {industryField}
            {sizeField}
            {ratingField}
            {websiteField}
            {checkboxFields}
            {onReset && (
              <Button variant="outline" className="w-full" onClick={onReset}>
                Reset filters
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export { DEFAULT_FILTERS };
