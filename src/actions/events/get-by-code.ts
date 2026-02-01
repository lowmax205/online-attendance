"use server";

import { db } from "@/lib/db";

/**
 * Get event by short code (O(1) lookup via indexed column)
 * @param code - 6-character event code
 * @returns Event data or error
 */
export async function getEventByCode(code: string) {
  try {
    if (!code || code.length !== 6) {
      return {
        success: false,
        error: "Invalid event code format. Code must be 6 characters.",
      };
    }

    // O(1) lookup using indexed eventCode column
    const event = await db.event.findUnique({
      where: {
        eventCode: code,
      },
      select: {
        id: true,
        name: true,
        startDateTime: true,
        endDateTime: true,
        venueName: true,
        venueAddress: true,
        status: true,
        eventCode: true,
      },
    });

    if (!event) {
      return {
        success: false,
        error: "Event not found. Please check the code and try again.",
      };
    }

    // Check if event is still active
    if (event.status !== "Active") {
      return {
        success: false,
        error: `Event is ${event.status}`,
      };
    }

    const now = new Date();
    const eventEnd = new Date(event.endDateTime);

    if (eventEnd < now) {
      return {
        success: false,
        error: "This event has already ended.",
      };
    }

    return {
      success: true,
      data: {
        id: event.id,
        name: event.name,
        startDateTime: event.startDateTime.toISOString(),
        endDateTime: event.endDateTime.toISOString(),
        venueName: event.venueName,
        venueAddress: event.venueAddress,
        code: event.eventCode,
      },
    };
  } catch (error) {
    console.error("Error looking up event by code:", error);
    return {
      success: false,
      error: "Failed to look up event. Please try again.",
    };
  }
}
