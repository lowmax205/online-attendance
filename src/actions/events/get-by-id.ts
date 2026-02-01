"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth/server";
import { checkSingleEvent } from "@/lib/events/status-monitor";

/**
 * Get event details by ID
 * @param eventId - Event ID
 * @returns Event with creator and attendance count
 */
export async function getEventById(eventId: string) {
  try {
    // Require authentication
    await requireAuth();

    // Ensure status is refreshed for this event before fetching details
    await checkSingleEvent(eventId);

    const event = await db.event.findUnique({
      where: { id: eventId },
      include: {
        User_Event_createdByIdToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: {
            Attendance: true,
          },
        },
      },
    });

    if (!event) {
      return {
        success: false,
        error: "Event not found",
      };
    }

    return {
      success: true,
      data: event,
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: "Failed to get event",
    };
  }
}
