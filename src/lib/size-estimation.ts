/**
 * Heuristic to estimate company size for lead prioritization.
 * Signals: review count, (future: locations, brand/franchise detection).
 */

import { SIZES, type BusinessSize } from "./constants";

/** Known franchise / multi-location brands (lowercase); expand as needed */
const FRANCHISE_INDICATORS = new Set([
  "mcdonald",
  "starbucks",
  "subway",
  "domino",
  "dunkin",
  "pizza hut",
  "wendy",
  "burger king",
  "taco bell",
  "chick-fil-a",
  "chipotle",
  "home depot",
  "lowes",
  "walmart",
  "target",
  "cvs",
  "walgreens",
  "fedex",
  "ups",
  "state farm",
  "geico",
  "h&r block",
  "marriott",
  "hilton",
  "hyatt",
]);

/**
 * Estimate company size from available signals.
 * Primary signal: review count. Secondary: name suggests franchise.
 */
export function estimateSize(params: {
  reviewCount: number;
  name?: string | null;
  /** Future: number of locations if we have it */
  locationCount?: number;
}): BusinessSize {
  const { reviewCount, name } = params;

  // Strong franchise signal → likely Large
  if (name) {
    const lower = name.toLowerCase();
    if (Array.from(FRANCHISE_INDICATORS).some((f) => lower.includes(f))) {
      return "Large";
    }
  }

  // Review-based heuristic
  if (reviewCount < 50) return "Small";
  if (reviewCount <= 300) return "Medium";
  return "Large";
}

export { SIZES };
