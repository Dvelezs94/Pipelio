/**
 * Google APIs used for the research tool:
 * - Geocoding: ZIP → lat/lng
 * - Places Nearby Search: businesses in radius
 * - Places Text Search: query string (e.g. "software companies in 64060 Mexico")
 * - Place Details: phone, website, rating, reviews, types
 */
import type { GeocodeCountry } from "@/lib/constants";

const GOOGLE_BASE = "https://maps.googleapis.com/maps/api";
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

if (!API_KEY && process.env.NODE_ENV === "production") {
  console.warn("GOOGLE_MAPS_API_KEY is not set");
}

export type GeocodeResult = { lat: number; lng: number } | null;

/** Result with optional error for clearer user messages */
export type GeocodeResultWithError =
  | { ok: true; lat: number; lng: number }
  | { ok: false; error: string };

/**
 * Convert a postal/ZIP code to coordinates using Geocoding API.
 * Pass country so the same code resolves to the intended country.
 */
export async function geocodeZip(
  zipCode: string,
  country?: GeocodeCountry
): Promise<GeocodeResultWithError> {
  const key = API_KEY?.trim();
  if (!key) {
    return { ok: false, error: "Google Maps API key is not configured. Add GOOGLE_MAPS_API_KEY to your .env." };
  }

  const trimmed = zipCode.trim();
  const address = trimmed;

  const url = new URL(`${GOOGLE_BASE}/geocode/json`);
  url.searchParams.set("address", address);
  if (country) {
    url.searchParams.set("components", `country:${country}`);
  }
  url.searchParams.set("key", key);

  const res = await fetch(url.toString());
  const data = (await res.json()) as {
    status: string;
    error_message?: string;
    results?: Array<{
      geometry: { location: { lat: number; lng: number } };
      address_components?: Array<{ types: string[]; short_name: string }>;
    }>;
  };

  if (data.status === "OK" && data.results?.[0]) {
    const loc = data.results[0].geometry.location;
    return { ok: true, lat: loc.lat, lng: loc.lng };
  }

  if (data.status === "REQUEST_DENIED") {
    const msg = data.error_message ?? "Request denied.";
    return {
      ok: false,
      error: "Geocoding API rejected the request. Ensure GOOGLE_MAPS_API_KEY is valid and Geocoding API is enabled. " + msg,
    };
  }
  if (data.status === "OVER_QUERY_LIMIT") {
    return { ok: false, error: "Geocoding API quota exceeded. Try again later." };
  }
  if (data.status === "ZERO_RESULTS") {
    return { ok: false, error: "Could not find coordinates for that ZIP or address. Try a different one or add country (e.g. 10001, USA)." };
  }
  return {
    ok: false,
    error: data.error_message ? `Geocoding error: ${data.error_message}` : "Could not find coordinates for that ZIP code.",
  };
}

/** Legacy: returns null on any failure (for callers that only need coords or null). */
export async function geocodeZipOrNull(zipCode: string, country?: GeocodeCountry): Promise<GeocodeResult> {
  const r = await geocodeZip(zipCode, country);
  return r.ok ? { lat: r.lat, lng: r.lng } : null;
}

export type NearbyPlace = {
  place_id: string;
  name: string;
  vicinity?: string;
  geometry?: { location: { lat: number; lng: number } };
  types?: string[];
  rating?: number;
  user_ratings_total?: number;
};

/**
 * Fetch one page of nearby places (max 20 per page).
 * Uses Nearby Search; pagination via next_page_token.
 * API limit: max 60 results per search (3 pages).
 */
export async function nearbySearch(params: {
  lat: number;
  lng: number;
  radiusMeters: number;
  pageToken?: string;
}): Promise<{
  results: NearbyPlace[];
  next_page_token?: string;
  status: string;
}> {
  const url = new URL(`${GOOGLE_BASE}/place/nearbysearch/json`);
  url.searchParams.set("location", `${params.lat},${params.lng}`);
  url.searchParams.set("radius", String(params.radiusMeters));
  url.searchParams.set("key", API_KEY || "");
  if (params.pageToken) url.searchParams.set("pagetoken", params.pageToken);

  const res = await fetch(url.toString());
  const data = (await res.json()) as {
    results: NearbyPlace[];
    next_page_token?: string;
    status: string;
  };
  return data;
}

/** ~meters per degree at a given latitude (approximate) */
const METERS_PER_DEG_LAT = 111_320;
function metersPerDegLng(latDeg: number): number {
  return 111_320 * Math.max(0.01, Math.cos((latDeg * Math.PI) / 180));
}

const MAX_GRID_CENTERS = 25;

/**
 * Generate grid centers covering a circle so we can run multiple nearby searches
 * and get more than the 60-result-per-search API limit. Each cell uses cellRadiusMeters.
 * Capped at MAX_GRID_CENTERS to avoid excessive API usage.
 */
export function getGridCenters(
  centerLat: number,
  centerLng: number,
  radiusMeters: number,
  cellRadiusMeters: number
): Array<{ lat: number; lng: number }> {
  let stepMeters = 2 * cellRadiusMeters;
  let numSteps = Math.max(1, Math.ceil((2 * radiusMeters) / stepMeters));
  while (numSteps * numSteps > MAX_GRID_CENTERS && numSteps > 1) {
    numSteps--;
    stepMeters = (2 * radiusMeters) / numSteps;
  }
  const half = (numSteps - 1) / 2;
  const deltaLat = stepMeters / METERS_PER_DEG_LAT;
  const deltaLng = stepMeters / metersPerDegLng(centerLat);
  const centers: Array<{ lat: number; lng: number }> = [];
  for (let i = 0; i < numSteps; i++) {
    for (let j = 0; j < numSteps; j++) {
      const lat = centerLat + (i - half) * deltaLat;
      const lng = centerLng + (j - half) * deltaLng;
      centers.push({ lat, lng });
    }
  }
  return centers;
}

const NEARBY_PAGE_DELAY_MS = 2000;

/**
 * Fetch all pages of nearby places for one center (up to 60 per center).
 * Stops when there is no next_page_token.
 */
export async function fetchAllNearbyForCenter(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<{ results: NearbyPlace[]; status: string }> {
  const results: NearbyPlace[] = [];
  let nextToken: string | undefined;
  do {
    const page = await nearbySearch({ lat, lng, radiusMeters, pageToken: nextToken });
    if (page.status !== "OK" && page.status !== "ZERO_RESULTS") {
      return { results, status: page.status };
    }
    if (page.results?.length) results.push(...page.results);
    nextToken = page.next_page_token;
    if (nextToken) await new Promise((r) => setTimeout(r, NEARBY_PAGE_DELAY_MS));
  } while (nextToken);
  return { results, status: "OK" };
}

/**
 * Text Search: one page (max 20). Uses legacy Places Text Search API.
 * @see https://developers.google.com/maps/documentation/places/web-service/search#TextSearchRequests
 */
export async function textSearch(params: {
  query: string;
  pageToken?: string;
}): Promise<{
  results: NearbyPlace[];
  next_page_token?: string;
  status: string;
}> {
  const url = new URL(`${GOOGLE_BASE}/place/textsearch/json`);
  url.searchParams.set("query", params.query.trim());
  url.searchParams.set("key", API_KEY || "");
  if (params.pageToken) url.searchParams.set("pagetoken", params.pageToken);

  const res = await fetch(url.toString());
  const data = (await res.json()) as {
    results?: NearbyPlace[];
    next_page_token?: string;
    status: string;
  };
  return {
    results: data.results ?? [],
    next_page_token: data.next_page_token,
    status: data.status,
  };
}

const TEXT_SEARCH_PAGE_DELAY_MS = 2000;

/**
 * Fetch all pages of text search (up to 60 results, 3 pages).
 */
export async function fetchAllTextSearch(query: string): Promise<{
  results: NearbyPlace[];
  status: string;
}> {
  const results: NearbyPlace[] = [];
  const seen = new Set<string>();
  let nextToken: string | undefined;
  do {
    const page = await textSearch({ query, pageToken: nextToken });
    if (page.status !== "OK" && page.status !== "ZERO_RESULTS") {
      return { results, status: page.status };
    }
    for (const place of page.results ?? []) {
      if (!seen.has(place.place_id)) {
        seen.add(place.place_id);
        results.push(place);
      }
    }
    nextToken = page.next_page_token;
    if (nextToken) await new Promise((r) => setTimeout(r, TEXT_SEARCH_PAGE_DELAY_MS));
  } while (nextToken);
  return { results, status: "OK" };
}

export type PlaceDetails = {
  place_id: string;
  name: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  geometry?: { location: { lat: number; lng: number } };
  international_phone_number?: string;
};

/**
 * Get full place details (phone, website, etc.).
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const url = new URL(`${GOOGLE_BASE}/place/details/json`);
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "place_id,name,formatted_address,formatted_phone_number,international_phone_number,website,rating,user_ratings_total,types,geometry");
  url.searchParams.set("key", API_KEY || "");

  const res = await fetch(url.toString());
  const data = (await res.json()) as { status: string; result?: PlaceDetails };

  if (data.status !== "OK" || !data.result) return null;
  return data.result;
}
