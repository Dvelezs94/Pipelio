import { NextRequest, NextResponse } from "next/server";
import { authenticateScraperRequest } from "@/lib/scraper-auth";
import { listWorkspacesForScraperUser } from "@/lib/scraper-api-keys";

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

/** GET /api/scraper/workspaces — list projects for the API key owner */
export async function GET(request: NextRequest) {
  const auth = await authenticateScraperRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Invalid or missing API key." }, { status: 401, headers: corsHeaders() });
  }

  const workspaces = await listWorkspacesForScraperUser(auth.userId);

  return NextResponse.json({ ok: true, workspaces }, { headers: corsHeaders() });
}
