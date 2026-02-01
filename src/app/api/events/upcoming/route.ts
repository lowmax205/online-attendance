import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/events/upcoming
 * Fetches upcoming and ongoing events
 * Cache-optimized with stale-while-revalidate for better performance
 */
export async function GET() {
  try {
    const now = new Date();

    // Get events that are either:
    // 1. Starting in the future (upcoming)
    // 2. Currently ongoing (started but not ended)
    const events = await db.event.findMany({
      where: {
        status: "Active",
        OR: [
          // Upcoming: starts in the future
          {
            startDateTime: {
              gte: now,
            },
          },
          // Ongoing: started but hasn't ended yet
          {
            startDateTime: {
              lte: now,
            },
            endDateTime: {
              gte: now,
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        startDateTime: true,
        venueName: true,
        status: true,
      },
      orderBy: {
        startDateTime: "asc",
      },
      take: 10, // Limit to 10 for navigation dropdown
    });

    const response = NextResponse.json({
      success: true,
      events,
    });

    // Add aggressive caching headers
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=120",
    );

    return response;
  } catch (error) {
    console.error("Failed to fetch upcoming events:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch upcoming events",
      },
      { status: 500 },
    );
  }
}
