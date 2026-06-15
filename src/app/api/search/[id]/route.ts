import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireWorkspaceId } from "@/lib/workspace";

/**
 * GET /api/search/:id
 * Retrieves a saved search with its businesses.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const workspaceId = await requireWorkspaceId();
  const search = await prisma.zipSearch.findFirst({
    where: { id, workspaceId },
    include: { businesses: true },
  });
  if (!search) {
    return NextResponse.json({ error: "Search not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: search.id,
    zipCode: search.zipCode,
    industry: search.industry,
    searchSource: search.searchSource,
    searchQuery: search.searchQuery,
    lat: search.lat,
    lng: search.lng,
    radius: search.radius,
    createdAt: search.createdAt.toISOString(),
    businesses: search.businesses,
  });
}
