import { NextRequest, NextResponse } from "next/server";
import { searchByIndustry } from "@/app/actions/search";
import { isIndustry } from "@/lib/constants";
import { isSearchSource, type SearchSourceId } from "@/lib/search-sources";
import { z } from "zod";

const bodySchema = z.object({
  industry: z.string().min(1),
  sources: z.array(z.string()).optional(),
});

/**
 * POST /api/search
 * Search companies by tech industry (SaaS, E-commerce, etc.)
 * Returns { searchId } or { error }.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body. Required: industry (string)." },
        { status: 400 }
      );
    }
    const { industry, sources: rawSources } = parsed.data;
    if (!isIndustry(industry)) {
      return NextResponse.json({ error: `Unknown industry: ${industry}` }, { status: 400 });
    }
    const sources = rawSources?.filter(isSearchSource) as SearchSourceId[] | undefined;
    const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "anonymous";
    const result = await searchByIndustry(industry, { rateLimitKey: ip, sources });
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 429 });
    }
    return NextResponse.json({ searchId: result.searchId });
  } catch (e) {
    console.error("POST /api/search", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
