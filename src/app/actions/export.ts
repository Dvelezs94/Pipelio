"use server";

import { prisma } from "@/lib/db";
import { requireWorkspaceId } from "@/lib/workspace";

/**
 * Export businesses for a search as CSV string.
 */
export async function exportSearchAsCsv(searchId: string): Promise<string> {
  const workspaceId = await requireWorkspaceId();
  const businesses = await prisma.business.findMany({
    where: { zipSearchId: searchId, workspaceId },
    orderBy: [{ industry: "asc" }, { name: "asc" }],
  });

  const headers = [
    "Name",
    "Industry",
    "Size",
    "Rating",
    "Reviews",
    "Phone",
    "Website",
    "Address",
    "Lead Score",
  ];
  const rows = businesses.map((b) =>
    [
      b.name,
      b.industry ?? "",
      b.size ?? "",
      b.rating ?? "",
      b.reviews,
      b.phone ?? "",
      b.website ?? "",
      (b.address ?? "").replace(/"/g, '""'),
      b.leadScore ?? "",
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`)
  );
  return [headers.map((h) => `"${h}"`).join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Export businesses for a search as JSON string.
 */
export async function exportSearchAsJson(searchId: string): Promise<string> {
  const workspaceId = await requireWorkspaceId();
  const businesses = await prisma.business.findMany({
    where: { zipSearchId: searchId, workspaceId },
    orderBy: [{ industry: "asc" }, { name: "asc" }],
  });
  return JSON.stringify(
    businesses.map((b) => ({
      name: b.name,
      industry: b.industry,
      size: b.size,
      rating: b.rating,
      reviews: b.reviews,
      phone: b.phone,
      website: b.website,
      address: b.address,
      leadScore: b.leadScore,
    })),
    null,
    2
  );
}
