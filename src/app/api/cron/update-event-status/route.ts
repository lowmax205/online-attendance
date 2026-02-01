import { NextRequest, NextResponse } from "next/server";
import { checkAndUpdateExpiredEvents } from "@/lib/events/status-monitor";
import { invalidateEventCache } from "@/lib/cache";

/**
 * API Route: POST /api/cron/update-event-status
 *
 * Background job to update expired event statuses.
 * This should be called by a cron job (e.g., Vercel Cron) every minute.
 *
 * Previously this ran on every dashboard page load, which was inefficient.
 * Moving it to a background job improves page load performance significantly.
 *
 * Security: Protected by a secret token in production
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret in production
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Run the status update
    const result = await checkAndUpdateExpiredEvents();

    // Invalidate cache if events were transitioned
    if (result.success && result.transitioned > 0) {
      invalidateEventCache();
    }

    return NextResponse.json({
      success: result.success,
      transitioned: result.transitioned,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Also support GET for easier testing in development
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Use POST method in production" },
      { status: 405 },
    );
  }

  return POST(request);
}
