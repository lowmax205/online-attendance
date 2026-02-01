/**
 * Event Status Monitoring Service
 * Monitors active events and auto-transitions them to Completed status
 * when endDateTime + checkOutBufferMins expires
 */

import { db } from "@/lib/db";

/**
 * Check and update expired events
 * This should be called periodically (e.g., via cron job or scheduled task)
 */
export async function checkAndUpdateExpiredEvents(): Promise<{
  success: boolean;
  transitioned: number;
  error?: string;
}> {
  try {
    const now = new Date();

    // Find all active events where check-out window has expired
    const expiredEvents = await db.event.findMany({
      where: {
        status: "Active",
        endDateTime: {
          lte: now,
        },
      },
      select: {
        id: true,
        endDateTime: true,
        checkOutBufferMins: true,
      },
    });

    // Filter events where endDateTime + checkOutBufferMins < now
    const eventsToComplete = expiredEvents.filter((event) => {
      const checkOutEndTime = new Date(event.endDateTime);
      checkOutEndTime.setMinutes(
        checkOutEndTime.getMinutes() + event.checkOutBufferMins,
      );
      return checkOutEndTime < now;
    });

    if (eventsToComplete.length === 0) {
      return {
        success: true,
        transitioned: 0,
      };
    }

    // Update all expired events to Completed status
    const result = await db.event.updateMany({
      where: {
        id: {
          in: eventsToComplete.map((e) => e.id),
        },
        status: "Active", // Double-check status hasn't changed
      },
      data: {
        status: "Completed",
      },
    });

    console.log(
      `Event status monitor: Transitioned ${result.count} events to Completed status`,
    );

    return {
      success: true,
      transitioned: result.count,
    };
  } catch (error) {
    console.error("Failed to check and update expired events:", error);
    return {
      success: false,
      transitioned: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Start monitoring events in real-time using interval
 * Check every minute for expired events
 * @param intervalMs - Interval in milliseconds (default: 60000 = 1 minute)
 */
export function startEventStatusMonitor(
  intervalMs: number = 60000,
): NodeJS.Timeout {
  console.log(`Event status monitor started (checking every ${intervalMs}ms)`);

  // Run immediately on start
  checkAndUpdateExpiredEvents();

  // Then run on interval
  return setInterval(() => {
    checkAndUpdateExpiredEvents();
  }, intervalMs);
}

/**
 * Stop the monitoring interval
 */
export function stopEventStatusMonitor(intervalId: NodeJS.Timeout): void {
  clearInterval(intervalId);
  console.log("Event status monitor stopped");
}

/**
 * Check if a specific event should be completed
 * Useful for on-demand checks when accessing event data
 */
export async function checkSingleEvent(eventId: string): Promise<boolean> {
  try {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: {
        status: true,
        endDateTime: true,
        checkOutBufferMins: true,
      },
    });

    if (!event || event.status !== "Active") {
      return false;
    }

    const now = new Date();
    const checkOutEndTime = new Date(event.endDateTime);
    checkOutEndTime.setMinutes(
      checkOutEndTime.getMinutes() + event.checkOutBufferMins,
    );

    if (checkOutEndTime < now) {
      await db.event.update({
        where: { id: eventId },
        data: { status: "Completed" },
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Failed to check event ${eventId}:`, error);
    return false;
  }
}
