import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE_NAME = "cyrux_admin_session";
const FALLBACK_JWT_SECRET = "cyrux-ultra-secure-jwt-secret-key-32chars-min!!";

// Public unauthenticated routes within the guarded matcher scope
const PUBLIC_ADMIN_PATHS = [
  "/admin/login",
  "/api/admin/login",
  "/api/admin/auth/login",
];

function getJwtSecretBytes(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET || FALLBACK_JWT_SECRET;
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPath = PUBLIC_ADMIN_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  let sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      sessionToken = authHeader.substring(7);
    }
  }

  let isValidSession = false;

  if (sessionToken) {
    try {
      const secret = getJwtSecretBytes();
      const { payload } = await jwtVerify(sessionToken, secret, {
        algorithms: ["HS256"],
      });
      if (payload && (payload.role === "admin" || payload.sub === "admin")) {
        isValidSession = true;
      }
    } catch {
      isValidSession = false;
    }
  }

  // Case 1: Public route handling
  if (isPublicPath) {
    // If user is already authenticated and visits /admin/login, redirect to /admin dashboard
    if (isValidSession && pathname === "/admin/login") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  // Case 2: Protected route with valid session
  if (isValidSession) {
    return NextResponse.next();
  }

  // Case 3: Unauthenticated /api/admin/* -> Return HTTP 401 JSON
  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Case 4: Unauthenticated /admin/* -> Redirect to /admin/login (HTTP 307)
  if (pathname.startsWith("/admin")) {
    const loginUrl = new URL("/admin/login", request.url);
    if (pathname !== "/admin") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(loginUrl, 307);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
