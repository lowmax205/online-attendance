import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import { getCachedUserSession } from "@/lib/cache";

/**
 * GET /api/auth/session
 * Returns current user session if valid token exists
 * Uses caching to reduce database load - session data is cached for 60 seconds
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;

    if (!accessToken) {
      return NextResponse.json({ error: "No session found" }, { status: 401 });
    }

    // Verify JWT token (no DB call - just crypto verification)
    let payload;
    try {
      payload = await verifyToken(accessToken);
    } catch (err) {
      console.error("Token verification failed:", err);
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 },
      );
    }

    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 },
      );
    }

    // Fetch user from cache (reduces DB calls significantly)
    let user;
    try {
      user = await getCachedUserSession(payload.userId);
    } catch (err) {
      console.error("Error fetching cached user session:", err);
      // If cache fails, return error instead of 500
      return NextResponse.json(
        { error: "Failed to fetch session data" },
        { status: 500 },
      );
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return user session with cache headers
    const response = NextResponse.json({ user });

    // Add cache control headers for client-side caching
    response.headers.set(
      "Cache-Control",
      "private, max-age=30, stale-while-revalidate=60",
    );

    return response;
  } catch (error) {
    console.error("Session check error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to check session";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
