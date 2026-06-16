"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ListingProfileLink, ListingSearchOrigin } from "@/components/ListingSourceLinks";
import { resolveBusinessSourceUrl, sourceLabelForBusiness } from "@/lib/listing-source";
import {
  ExternalLink,
  Linkedin,
  Phone,
  UserPlus,
  Check,
} from "lucide-react";

type ZipSearchRef = {
  id?: string;
  zipCode?: string;
  countryCode?: string;
  searchSource?: string | null;
  searchQuery?: string | null;
};

export type BusinessDetailFields = {
  id: string;
  name: string;
  placeId?: string | null;
  sourceUrl?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  industry?: string | null;
  category?: string | null;
  size?: string | null;
  rating?: number | null;
  reviews?: number;
  leadScore?: number | null;
  description?: string | null;
  hourlyRate?: string | null;
  minProjectSize?: string | null;
  employeeRange?: string | null;
  domain?: string | null;
  zipSearch?: ZipSearchRef | null;
};

function display(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  return String(value);
}

function DetailRow({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

export function BusinessDetailModal({
  business,
  open,
  onOpenChange,
  savedToCrm,
  savingToCrm,
  onSaveToCrm,
}: {
  business: BusinessDetailFields | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savedToCrm?: boolean;
  savingToCrm?: boolean;
  onSaveToCrm?: (businessId: string) => void;
}) {
  if (!business) return null;

  const listingUrl = resolveBusinessSourceUrl(business);
  const websiteHref = business.website
    ? business.website.startsWith("http")
      ? business.website
      : `https://${business.website}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
          <DialogTitle className="pr-8">{business.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {display(business.industry)}
            {business.leadScore != null ? ` · Lead score ${business.leadScore}` : ""}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 space-y-6">
          <section>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">About</h4>
            {business.description ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{business.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No description stored. Re-scrape from the listing page with the browser extension to
                capture it.
              </p>
            )}
          </section>

          <section>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3">Company</h4>
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <DetailRow label="Industry" className="sm:col-span-2">
                {display(business.industry)}
              </DetailRow>
              <DetailRow label="Category" className="sm:col-span-2">
                {display(business.category)}
              </DetailRow>
              <DetailRow label="Location" className="sm:col-span-2">
                {display(business.address)}
              </DetailRow>
              <DetailRow label="Size (estimate)">{display(business.size)}</DetailRow>
              <DetailRow label="Employees">{display(business.employeeRange)}</DetailRow>
              <DetailRow label="Hourly rate">{display(business.hourlyRate)}</DetailRow>
              <DetailRow label="Min. project size">{display(business.minProjectSize)}</DetailRow>
              <DetailRow label="Rating">
                {business.rating != null
                  ? `★ ${business.rating}${business.reviews != null ? ` (${business.reviews} reviews)` : ""}`
                  : "—"}
              </DetailRow>
              <DetailRow label="Reviews">{display(business.reviews)}</DetailRow>
              <DetailRow label="Domain">{display(business.domain)}</DetailRow>
            </dl>
          </section>

          <section>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3">Contact</h4>
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <DetailRow label="Phone">
                {business.phone ? (
                  <a href={`tel:${business.phone}`} className="text-primary hover:underline">
                    {business.phone}
                  </a>
                ) : (
                  "—"
                )}
              </DetailRow>
              <DetailRow label="Email">
                {business.email ? (
                  <a href={`mailto:${business.email}`} className="text-primary hover:underline">
                    {business.email}
                  </a>
                ) : (
                  "—"
                )}
              </DetailRow>
              <DetailRow label="Website" className="sm:col-span-2">
                {websiteHref ? (
                  <a
                    href={websiteHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {business.website!.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  "—"
                )}
              </DetailRow>
            </dl>
          </section>

          <section>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3">Source</h4>
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <DetailRow label="Listing profile">
                {listingUrl ? <ListingProfileLink business={business} /> : "—"}
              </DetailRow>
              <DetailRow label="Found via">
                {business.zipSearch ? (
                  business.zipSearch.zipCode &&
                  !business.zipSearch.searchSource?.startsWith("browser_extension:") ? (
                    <Link
                      href={`/results/${business.zipSearch.id}`}
                      className="text-primary hover:underline"
                    >
                      {business.zipSearch.zipCode} ({business.zipSearch.countryCode})
                    </Link>
                  ) : (
                    <ListingSearchOrigin zipSearch={business.zipSearch} />
                  )
                ) : (
                  "—"
                )}
              </DetailRow>
            </dl>
          </section>

          <section className="flex flex-wrap gap-2 pb-2">
            {listingUrl && (
              <a
                href={listingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                View on {sourceLabelForBusiness(business)}
              </a>
            )}
            {websiteHref && (
              <a
                href={websiteHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Visit website
              </a>
            )}
            <a
              href={`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(business.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
            >
              <Linkedin className="h-4 w-4 mr-1" />
              LinkedIn
            </a>
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
              >
                <Phone className="h-4 w-4 mr-1" />
                Call
              </a>
            )}
            {onSaveToCrm &&
              (savedToCrm ? (
                <Link href="/crm">
                  <Button variant="outline" size="sm" className="gap-1">
                    <Check className="h-4 w-4" />
                    In CRM
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  className="gap-1"
                  disabled={savingToCrm}
                  onClick={() => onSaveToCrm(business.id)}
                >
                  <UserPlus className="h-4 w-4" />
                  {savingToCrm ? "Saving..." : "Save to CRM"}
                </Button>
              ))}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
