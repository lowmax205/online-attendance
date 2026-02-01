import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, generateAccessToken } from "@/lib/auth/jwt";
import { getAccessTokenCookieOptions } from "@/lib/auth/cookies";

/**
 * Middleware for Next.js App Router
 * Handles authentication and authorization for protected routes
 * Runs on Edge Runtime for optimal performance
 */

// Routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/profile",
  "/events/create",
  "/events/manage",
];

// Routes accessible without profile completion
const profileExemptRoutes = [
  "/profile/create",
  "/auth/login",
  "/auth/register",
];

// Routes that require specific roles (T059)
const roleBasedRoutes: Record<
  string,
  Array<"Student" | "Moderator" | "Administrator">
> = {
  "/dashboard/student": ["Student"],
  "/dashboard/moderator": ["Moderator", "Administrator"],
  "/dashboard/admin": ["Administrator"],
  "/events/create": ["Moderator", "Administrator"],
  "/events/manage": ["Moderator", "Administrator"],
  // Analytics dashboard (admin only, but moderator can view)
  "/dashboard/admin/analytics": ["Administrator", "Moderator"],
  // User management (admin primary, moderator read-only)
  "/dashboard/admin/users": ["Administrator", "Moderator"],
  // All events and attendance views (both roles)
  "/dashboard/admin/events": ["Administrator", "Moderator"],
  "/dashboard/admin/attendance": ["Administrator", "Moderator"],
};

// Public routes that don't require authentication
const publicRoutes = ["/", "/updates", "/attendance"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/public") ||
    pathname === "/sw.js" ||
    pathname === "/manifest.json" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Check if route is public
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check if route requires authentication
  const requiresAuth = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );

  if (!requiresAuth) {
    return NextResponse.next();
  }

  // Get access token from cookie
  const accessToken = request.cookies.get("accessToken")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;

  // Verify token
  const payload = accessToken ? await verifyToken(accessToken) : null;

  if (!payload || payload.type !== "access") {
    // Access token is missing or invalid. Try to refresh using refresh token.
    if (refreshToken) {
      const refreshPayload = await verifyToken(refreshToken);

      if (refreshPayload && refreshPayload.type === "refresh") {
        // Refresh token is valid. Generate new access token.
        const newAccessToken = await generateAccessToken({
          userId: refreshPayload.userId,
          email: refreshPayload.email,
          role: refreshPayload.role,
          hasProfile: refreshPayload.hasProfile,
          accountStatus: refreshPayload.accountStatus,
        });

        // Redirect to the same URL to ensure the new cookie is picked up by Server Components
        const response = NextResponse.redirect(request.url);
        response.cookies.set(
          "accessToken",
          newAccessToken,
          getAccessTokenCookieOptions(),
        );
        return response;
      }
    }

    // Redirect to login page with return URL
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("returnUrl", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // T058: Check account status
  if (payload.accountStatus === "SUSPENDED") {
    // Account is suspended - clear cookies and redirect
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("error", "account_suspended");

    const response = NextResponse.redirect(url);
    response.cookies.delete("accessToken");
    response.cookies.delete("refreshToken");
    return response;
  }

  // Check if user has completed their profile
  const isProfileExempt = profileExemptRoutes.some((route) =>
    pathname.startsWith(route),
  );

  if (!payload.hasProfile && !isProfileExempt) {
    // User hasn't completed profile - redirect to profile creation
    const url = request.nextUrl.clone();
    url.pathname = "/profile/create";
    return NextResponse.redirect(url);
  }

  // If user has profile and tries to access profile creation, redirect to dashboard
  if (payload.hasProfile && pathname.startsWith("/profile/create")) {
    const url = request.nextUrl.clone();
    switch (payload.role) {
      case "Student":
        url.pathname = "/dashboard/student";
        break;
      case "Moderator":
        url.pathname = "/dashboard/moderator";
        break;
      case "Administrator":
        url.pathname = "/dashboard/admin";
        break;
      default:
        url.pathname = "/";
    }
    return NextResponse.redirect(url);
  }

  // Check role-based access for dashboard routes
  // Sort routes by length (longest first) to check most specific routes first
  const sortedRoutes = Object.entries(roleBasedRoutes).sort(
    ([a], [b]) => b.length - a.length,
  );

  for (const [route, allowedRoles] of sortedRoutes) {
    if (pathname.startsWith(route)) {
      if (!allowedRoles.includes(payload.role)) {
        // User doesn't have permission - redirect to their appropriate dashboard
        const url = request.nextUrl.clone();

        // Redirect to role-specific dashboard
        switch (payload.role) {
          case "Student":
            url.pathname = "/dashboard/student";
            break;
          case "Moderator":
            url.pathname = "/dashboard/moderator";
            break;
          case "Administrator":
            url.pathname = "/dashboard/admin";
            break;
          default:
            url.pathname = "/";
        }

        url.searchParams.set("error", "insufficient_permissions");
        return NextResponse.redirect(url);
      }
      // Permission granted - allow access
      break;
    }
  }

  // Handle /dashboard root redirect based on role
  if (pathname === "/dashboard") {
    const url = request.nextUrl.clone();

    switch (payload.role) {
      case "Student":
        url.pathname = "/dashboard/student";
        break;
      case "Moderator":
        url.pathname = "/dashboard/moderator";
        break;
      case "Administrator":
        url.pathname = "/dashboard/admin";
        break;
      default:
        url.pathname = "/";
    }

    return NextResponse.redirect(url);
  }

  // Authentication and authorization successful
  return NextResponse.next();
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - sw.js (service worker)
     * - manifest.json (PWA manifest)
     */
    "/((?!_next/static|_next/image|favicon.ico|public/|sw.js|manifest.json).*)",
  ],
};
