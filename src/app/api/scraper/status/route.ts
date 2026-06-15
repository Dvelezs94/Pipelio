import { NextRequest, NextResponse } from "next/server";
import { getScraperApiKey, isScraperAuthorized } from "@/lib/scraper-auth";
import { resolveScraperWorkspaceId } from "@/lib/scraper-import";
import { SCRAPER_WORKSPACE_HEADER } from "@/lib/scraper-auth";

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "x-scraper-key, x-workspace-id",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/** GET /api/scraper/status — health check for the browser extension */
export async function GET(request: NextRequest) {
  if (!getScraperApiKey()) {
    return NextResponse.json(
      { ok: false, error: "SCRAPER_API_KEY is not configured." },
      { status: 503, headers: corsHeaders() }
    );
  }

  if (!isScraperAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401, headers: corsHeaders() });
  }

  const workspaceId = await resolveScraperWorkspaceId(request.headers.get(SCRAPER_WORKSPACE_HEADER));

  return NextResponse.json(
    {
      ok: true,
      workspaceId,
      message: "Scraper API is ready.",
    },
    { headers: corsHeaders() }
  );
}
