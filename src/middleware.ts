import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "session";
const PUBLIC_PATHS = ["/login", "/register"];

function isScraperApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/scraper");
}

function isScraperAuthorized(request: NextRequest): boolean {
  const expected = process.env.SCRAPER_API_KEY?.trim();
  if (!expected) return false;
  const key = request.headers.get("x-scraper-key");
  return key === expected;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  return new TextEncoder().encode(secret ?? "dev-secret-change-me");
}

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  if (isScraperApiRoute(pathname)) {
    if (isScraperAuthorized(request)) {
      return NextResponse.next();
    }
    return NextResponse.json({ error: "Invalid or missing scraper API key." }, { status: 401 });
  }

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    if (await isAuthenticated(request)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!(await isAuthenticated(request))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
