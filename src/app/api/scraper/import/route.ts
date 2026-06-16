import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  authenticateScraperRequest,
  SCRAPER_WORKSPACE_HEADER,
} from "@/lib/scraper-auth";
import { resolveWorkspaceForScraperUser } from "@/lib/scraper-api-keys";
import { importScrapedCompanies } from "@/lib/scraper-import";

const companySchema = z.object({
  externalId: z.string().optional(),
  name: z.string().min(1),
  website: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  category: z.string().max(50).nullable().optional(),
  industry: z.string().nullable().optional(),
  reviews: z.number().int().nonnegative().optional(),
  rating: z.number().nullable().optional(),
  profileUrl: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  hourlyRate: z.string().nullable().optional(),
  minProjectSize: z.string().nullable().optional(),
  employeeRange: z.string().nullable().optional(),
});

const bodySchema = z.object({
  source: z.string().min(1),
  pageUrl: z.string().url(),
  searchLabel: z.string().optional(),
  workspaceId: z.string().min(1),
  companies: z.array(companySchema).min(1).max(200),
});

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-scraper-key, x-workspace-id",
  };
}

/**
 * POST /api/scraper/import
 * Auth: x-scraper-key (user-generated key from Settings → Extension).
 * Requires workspaceId (project) owned by the key's user.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateScraperRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Invalid or missing API key." }, { status: 401, headers: corsHeaders() });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400, headers: corsHeaders() });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
      { status: 400, headers: corsHeaders() }
    );
  }

  const headerWorkspaceId = request.headers.get(SCRAPER_WORKSPACE_HEADER);
  const workspaceId = await resolveWorkspaceForScraperUser(
    auth.userId,
    parsed.data.workspaceId ?? headerWorkspaceId
  );

  if (!workspaceId) {
    return NextResponse.json(
      { error: "Project not found. Select a project in the extension settings." },
      { status: 400, headers: corsHeaders() }
    );
  }

  try {
    const result = await importScrapedCompanies({
      workspaceId,
      source: parsed.data.source,
      pageUrl: parsed.data.pageUrl,
      searchLabel: parsed.data.searchLabel,
      companies: parsed.data.companies,
    });

    return NextResponse.json(
      {
        ok: true,
        ...result,
        workspaceId,
      },
      { headers: corsHeaders() }
    );
  } catch (e) {
    console.error("[scraper/import]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Import failed." },
      { status: 500, headers: corsHeaders() }
    );
  }
}
