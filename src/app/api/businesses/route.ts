import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireWorkspaceId } from "@/lib/workspace";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

// Prisma 7 findMany arg type doesn't expose 'where' the same way; build where object and pass explicitly
type BusinessWhere = {
  workspaceId?: string;
  id?: { notIn: string[] };
  zipSearchId?: string;
  industry?: string;
  size?: string;
  rating?: { gte: number };
  website?: { not: null } | null;
  phone?: { not: null };
  dismissedAt?: null;
  OR?: Array<{ name?: { contains: string; mode: "insensitive" }; address?: { contains: string; mode: "insensitive" }; industry?: { contains: string; mode: "insensitive" } }>;
};

/**
 * GET /api/businesses
 * Query params: zipSearchId, industry, size, minRating, hasWebsite, hasPhone, search, page, limit, sortBy, sortOrder
 */
export async function GET(request: NextRequest) {
  const workspaceId = await requireWorkspaceId();
  const { searchParams } = new URL(request.url);
  const zipSearchId = searchParams.get("zipSearchId") ?? undefined;
  const industry = searchParams.get("industry") ?? undefined;
  const size = searchParams.get("size") ?? undefined;
  const minRating = searchParams.get("minRating");
  const hasWebsite = searchParams.get("hasWebsite");
  const hasPhone = searchParams.get("hasPhone");
  const search = searchParams.get("search") ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10)));
  const sortBy = searchParams.get("sortBy") ?? "name";
  const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";
  const includeZipSearch = searchParams.get("includeZipSearch") === "true";
  const includeDismissed = searchParams.get("includeDismissed") === "true";
  const excludeInCrm = searchParams.get("excludeInCrm") === "true";

  const where: BusinessWhere = { workspaceId };
  if (zipSearchId) where.zipSearchId = zipSearchId;
  if (!includeDismissed) where.dismissedAt = null;
  if (excludeInCrm) {
    const inCrmIds = await prisma.crmLead
      .findMany({
        where: { business: { workspaceId } },
        select: { businessId: true },
      })
      .then((leads) => leads.map((l) => l.businessId));
    if (inCrmIds.length > 0) where.id = { notIn: inCrmIds };
  }
  if (industry) where.industry = industry;
  if (size) where.size = size;
  if (minRating != null && minRating !== "") {
    const r = parseFloat(minRating);
    if (!Number.isNaN(r)) where.rating = { gte: r };
  }
  if (hasWebsite === "true") where.website = { not: null };
  if (hasWebsite === "false") where.website = null;
  if (hasPhone === "true") where.phone = { not: null };
  if (search?.trim()) {
    where.OR = [
      { name: { contains: search.trim(), mode: "insensitive" } },
      { address: { contains: search.trim(), mode: "insensitive" } },
      { industry: { contains: search.trim(), mode: "insensitive" } },
    ];
  }

  const orderBy: Record<string, "asc" | "desc"> = {};
  const allowedSort = ["name", "industry", "size", "rating", "reviews", "leadScore"];
  if (allowedSort.includes(sortBy)) orderBy[sortBy] = sortOrder;

  const findManyArg = {
    where,
    orderBy: Object.keys(orderBy).length ? orderBy : { name: "asc" },
    skip: (page - 1) * limit,
    take: limit,
    ...(includeZipSearch && {
      include: {
        zipSearch: {
          select: {
            id: true,
            zipCode: true,
            countryCode: true,
            searchSource: true,
            searchQuery: true,
          },
        },
      },
    }),
  };
  const countArg = { where };
  const [businesses, total] = await Promise.all([
    prisma.business.findMany(findManyArg as never),
    prisma.business.count(countArg as never),
  ]);

  return NextResponse.json({
    businesses,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
