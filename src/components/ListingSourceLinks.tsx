import { ExternalLink } from "lucide-react";
import {
  extensionSourceKey,
  EXTENSION_SOURCE_LABELS,
  listingSiteLabelFromUrl,
  resolveBusinessSourceUrl,
  sourceLabelForBusiness,
} from "@/lib/listing-source";

type ZipSearchRef = {
  id: string;
  zipCode: string;
  countryCode: string;
  searchSource?: string | null;
  searchQuery?: string | null;
};

type BusinessSourceFields = {
  sourceUrl?: string | null;
  placeId?: string | null;
  zipSearch?: ZipSearchRef | null;
};

export function ListingProfileLink({
  business,
  className = "flex items-center gap-1 text-primary hover:underline",
}: {
  business: BusinessSourceFields;
  className?: string;
}) {
  const url = resolveBusinessSourceUrl(business);
  if (!url) return <>—</>;

  const label = sourceLabelForBusiness(business);
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className} title={url}>
      <ExternalLink className="h-3 w-3 shrink-0" />
      {label}
    </a>
  );
}

export function ListingSearchOrigin({
  zipSearch,
  className = "text-primary hover:underline",
}: {
  zipSearch?: ZipSearchRef | null;
  className?: string;
}) {
  if (!zipSearch) return <>—</>;

  const extKey = extensionSourceKey(zipSearch.searchSource);
  if (extKey) {
    const label = EXTENSION_SOURCE_LABELS[extKey] ?? extKey;
    const listingUrl = zipSearch.searchQuery?.trim();
    if (listingUrl?.startsWith("http")) {
      const pageLabel = listingSiteLabelFromUrl(listingUrl);
      return (
        <a href={listingUrl} target="_blank" rel="noopener noreferrer" className={className} title={listingUrl}>
          {pageLabel} search
        </a>
      );
    }
    return <span className="text-muted-foreground">{label}</span>;
  }

  if (zipSearch.zipCode) {
    return (
      <span className="text-muted-foreground">
        {zipSearch.zipCode} ({zipSearch.countryCode})
      </span>
    );
  }

  return <>—</>;
}
