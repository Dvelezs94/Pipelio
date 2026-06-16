"use client";

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
            {business.industry ?? "—"}
            {business.leadScore != null ? ` · Lead score ${business.leadScore}` : ""}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 space-y-6">
          {business.description && (
            <section>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">About</h4>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{business.description}</p>
            </section>
          )}

          <section>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3">Details</h4>
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              {business.category && (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Category</dt>
                  <dd>{business.category}</dd>
                </div>
              )}
              {business.address && (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Location</dt>
                  <dd>{business.address}</dd>
                </div>
              )}
              {business.size && (
                <div>
                  <dt className="text-muted-foreground">Size</dt>
                  <dd>{business.size}</dd>
                </div>
              )}
              {business.employeeRange && (
                <div>
                  <dt className="text-muted-foreground">Employees</dt>
                  <dd>{business.employeeRange}</dd>
                </div>
              )}
              {business.hourlyRate && (
                <div>
                  <dt className="text-muted-foreground">Hourly rate</dt>
                  <dd>{business.hourlyRate}</dd>
                </div>
              )}
              {business.minProjectSize && (
                <div>
                  <dt className="text-muted-foreground">Min. project size</dt>
                  <dd>{business.minProjectSize}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Rating</dt>
                <dd>
                  {business.rating != null
                    ? `★ ${business.rating}${business.reviews != null ? ` (${business.reviews} reviews)` : ""}`
                    : "—"}
                </dd>
              </div>
              {business.domain && (
                <div>
                  <dt className="text-muted-foreground">Domain</dt>
                  <dd>{business.domain}</dd>
                </div>
              )}
              {business.phone && (
                <div>
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd>
                    <a href={`tel:${business.phone}`} className="text-primary hover:underline">
                      {business.phone}
                    </a>
                  </dd>
                </div>
              )}
              {business.email && (
                <div>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd>
                    <a href={`mailto:${business.email}`} className="text-primary hover:underline">
                      {business.email}
                    </a>
                  </dd>
                </div>
              )}
              {business.website && (
                <div>
                  <dt className="text-muted-foreground">Website</dt>
                  <dd>
                    <a
                      href={websiteHref!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {business.website.replace(/^https?:\/\//, "")}
                    </a>
                  </dd>
                </div>
              )}
              {listingUrl && (
                <div>
                  <dt className="text-muted-foreground">Listing profile</dt>
                  <dd>
                    <ListingProfileLink business={business} />
                  </dd>
                </div>
              )}
              {business.zipSearch && (
                <div>
                  <dt className="text-muted-foreground">Found via</dt>
                  <dd>
                    {business.zipSearch.zipCode &&
                    !business.zipSearch.searchSource?.startsWith("browser_extension:") ? (
                      <Link
                        href={`/results/${business.zipSearch.id}`}
                        className="text-primary hover:underline"
                      >
                        {business.zipSearch.zipCode} ({business.zipSearch.countryCode})
                      </Link>
                    ) : (
                      <ListingSearchOrigin zipSearch={business.zipSearch} />
                    )}
                  </dd>
                </div>
              )}
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
