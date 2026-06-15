import type { BusinessSize } from "./constants";

export type TechLead = {
  externalId: string;
  name: string;
  website: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  category: string | null;
  industry: string;
  reviews: number;
  rating: number | null;
  source: string;
};

export function extractDomain(website: string | null | undefined): string | null {
  if (!website?.trim()) return null;
  try {
    const u = new URL(website.startsWith("http") ? website : `https://${website}`);
    return u.hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

export function computeTechLeadScore(lead: {
  website: string | null;
  email: string | null;
  reviews: number;
}): number {
  let score = 0;
  if (lead.website) score += 40;
  if (lead.email) score += 25;
  if (lead.reviews >= 100) score += 20;
  else if (lead.reviews >= 20) score += 12;
  else if (lead.reviews >= 5) score += 6;
  return Math.min(100, score);
}

export function estimateTechSize(params: {
  engagement: number;
  name?: string | null;
}): BusinessSize {
  const { engagement } = params;
  if (engagement < 20) return "Small";
  if (engagement < 200) return "Medium";
  return "Large";
}
