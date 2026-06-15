import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getScraperApiKey, isScraperAuthorized } from "@/lib/scraper-auth";

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "x-scraper-key",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/** GET /api/scraper/workspaces — list workspaces for extension setup */
export async function GET(request: NextRequest) {
  if (!getScraperApiKey()) {
    return NextResponse.json(
      { error: "SCRAPER_API_KEY is not configured." },
      { status: 503, headers: corsHeaders() }
    );
  }

  if (!isScraperAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: corsHeaders() });
  }

  const workspaces = await prisma.workspace.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, slug: true },
  });

  return NextResponse.json({ workspaces }, { headers: corsHeaders() });
}
