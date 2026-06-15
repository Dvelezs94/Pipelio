import { NextRequest, NextResponse } from "next/server";
import { geocodeZip } from "@/lib/google-places";
import { isGeocodeCountry } from "@/lib/constants";

/**
 * GET /api/geocode?zip=64480&country=MX
 * Returns { lat, lng } or { error } for map preview.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const zip = searchParams.get("zip")?.trim();
  const countryParam = (searchParams.get("country") ?? "MX").toUpperCase();

  if (!zip) {
    return NextResponse.json({ error: "Missing zip parameter" }, { status: 400 });
  }
  if (!isGeocodeCountry(countryParam)) {
    return NextResponse.json({ error: "Unsupported country code" }, { status: 400 });
  }

  const result = await geocodeZip(zip, countryParam);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ lat: result.lat, lng: result.lng });
}
