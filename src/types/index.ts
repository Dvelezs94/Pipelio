/** Business record as returned from DB / API */
export interface BusinessRecord {
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
  /** When set, business is dismissed (hidden by default) */
  dismissedAt?: string | null;
  /** When set, user opened an external link for this business */
  viewedAt?: string | null;
}

/** Saved search with optional business list */
export interface ZipSearchRecord {
  id: string;
  zipCode: string;
  lat: number;
  lng: number;
  radius: number;
  createdAt: string;
  businesses?: BusinessRecord[];
}

/** Filters for GET /api/businesses */
export interface BusinessFilters {
  zipSearchId?: string;
  industry?: string;
  size?: string;
  minRating?: number;
  hasWebsite?: "any" | "true" | "false";
  hasPhone?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  includeDismissed?: boolean;
}
