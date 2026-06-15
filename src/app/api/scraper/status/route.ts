import { NextRequest, NextResponse } from "next/server";
import { authenticateScraperRequest, SCRAPER_WORKSPACE_HEADER } from "@/lib/scraper-auth";
import { resolveWorkspaceForScraperUser } from "@/lib/scraper-api-keys";

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

/** GET /api/scraper/status — validate API key and optional project selection */
export async function GET(request: NextRequest) {
  const auth = await authenticateScraperRequest(request);
  if (!auth) {
    return NextResponse.json({ ok: false, error: "Invalid or missing API key." }, { status: 401, headers: corsHeaders() });
  }

  const selectedWorkspaceId = request.headers.get(SCRAPER_WORKSPACE_HEADER);
  const workspaceId = selectedWorkspaceId
    ? await resolveWorkspaceForScraperUser(auth.userId, selectedWorkspaceId)
    : null;

  return NextResponse.json(
    {
      ok: true,
      userId: auth.userId,
      workspaceId,
      workspaceValid: selectedWorkspaceId ? Boolean(workspaceId) : null,
      message: "API key valid.",
    },
    { headers: corsHeaders() }
  );
}
