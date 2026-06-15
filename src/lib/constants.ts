/** Country/region for geocoding (legacy ZIP search) */
export const GEO_COUNTRIES = [
  { value: "AR", label: "Argentina" },
  { value: "AU", label: "Australia" },
  { value: "BR", label: "Brazil" },
  { value: "CA", label: "Canada" },
  { value: "CL", label: "Chile" },
  { value: "CO", label: "Colombia" },
  { value: "DE", label: "Germany" },
  { value: "ES", label: "Spain" },
  { value: "FR", label: "France" },
  { value: "GB", label: "United Kingdom" },
  { value: "IN", label: "India" },
  { value: "US", label: "United States" },
  { value: "MX", label: "Mexico" },
  { value: "PE", label: "Peru" },
] as const;

export type GeocodeCountry = (typeof GEO_COUNTRIES)[number]["value"];

const GEO_COUNTRY_SET = new Set<string>(GEO_COUNTRIES.map((country) => country.value));

export function isGeocodeCountry(value: string): value is GeocodeCountry {
  return GEO_COUNTRY_SET.has(value);
}

/** Radius options in km (legacy ZIP search) */
export const RADIUS_OPTIONS_KM = [1, 5, 10, 25] as const;

export const RADIUS_LABELS: Record<number, string> = {
  1: "1 km",
  5: "5 km",
  10: "10 km",
  25: "25 km",
};

/** Internet / tech industries for lead research */
export const INDUSTRIES = [
  "SaaS",
  "E-commerce",
  "Software Development",
  "Developer Tools",
  "Fintech",
  "AI / Machine Learning",
  "Cybersecurity",
  "EdTech",
  "HealthTech",
  "Marketplace",
] as const;

export type Industry = (typeof INDUSTRIES)[number];

const INDUSTRY_SET = new Set<string>(INDUSTRIES);

export function isIndustry(value: string): value is Industry {
  return INDUSTRY_SET.has(value);
}

/** Company size tiers */
export const SIZES = ["Small", "Medium", "Large"] as const;

export type BusinessSize = (typeof SIZES)[number];

/** Rate limit: max searches per minute per IP (approximate) */
export const RATE_LIMIT_SEARCHES_PER_MINUTE = 10;

/** Default max leads per industry search */
export const DEFAULT_INDUSTRY_SEARCH_LIMIT = 50;
