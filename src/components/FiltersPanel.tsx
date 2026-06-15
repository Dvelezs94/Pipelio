"use client";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Filter } from "lucide-react";

export type HasWebsiteFilter = "any" | "true" | "false";

export interface FiltersState {
  industry: string;
  size: string;
  minRating: string;
  hasWebsite: HasWebsiteFilter;
  hasPhone: boolean;
  search: string;
  /** When true, include dismissed businesses in the list (unchecked by default = hide dismissed) */
  showDismissed: boolean;
}

const DEFAULT_FILTERS: FiltersState = {
  industry: "",
  size: "",
  minRating: "",
  hasWebsite: "any",
  hasPhone: false,
  search: "",
  showDismissed: false,
};

export interface FiltersPanelProps {
  filters: FiltersState;
  onFiltersChange: (f: FiltersState) => void;
  onReset?: () => void;
}

export function FiltersPanel({ filters, onFiltersChange, onReset }: FiltersPanelProps) {
  const update = (patch: Partial<FiltersState>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="h-5 w-5" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground">Search by business name</label>
          <Input
            placeholder="Business name, address, or industry..."
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground">Industry</label>
          <Select value={filters.industry || "all"} onValueChange={(v) => update({ industry: v === "all" ? "" : v })}>
            <SelectTrigger className="mt-1">
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
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground">Company size</label>
          <Select value={filters.size || "all"} onValueChange={(v) => update({ size: v === "all" ? "" : v })}>
            <SelectTrigger className="mt-1">
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
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground">Min. rating</label>
          <Select
            value={filters.minRating || "any"}
            onValueChange={(v) => update({ minRating: v === "any" ? "" : v })}
          >
            <SelectTrigger className="mt-1">
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
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground">Has website</label>
          <Select
            value={filters.hasWebsite}
            onValueChange={(v) => update({ hasWebsite: v as FiltersState["hasWebsite"] })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
              id="show-dismissed"
              checked={filters.showDismissed}
              onCheckedChange={(c) => update({ showDismissed: !!c })}
            />
            <label htmlFor="show-dismissed" className="text-sm">
              Show dismissed
            </label>
          </div>
        </div>
        {onReset && (
          <Button variant="outline" className="w-full" onClick={onReset}>
            Reset filters
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export { DEFAULT_FILTERS };
