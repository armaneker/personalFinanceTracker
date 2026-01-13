import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Middleware to protect API routes
 * All /api/* routes require authentication except /api/auth/*
 * Unauthenticated requests to protected routes receive 401
 * Unauthenticated access to pages redirects to /login
 *
 * Note: Environment validation runs in instrumentation.ts (Node.js runtime)
 * instead of here (Edge Runtime) since Edge doesn't support process.exit()
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow auth routes and version endpoint to pass through
  if (pathname.startsWith("/api/auth") || pathname === "/api/version") {
    return NextResponse.next();
  }

  // Check for JWT token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Handle API routes - return 401 for unauthenticated requests
  if (pathname.startsWith("/api")) {
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // Handle protected pages - redirect to login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", encodeURIComponent(pathname));
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect API routes except auth
    "/api/:path*",
    // Protect main app routes (add more as needed)
    "/",
    "/dashboard/:path*",
    "/import/:path*",
    "/transactions/:path*",
    "/analytics/:path*",
  ],
};
