"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/server";
import { z } from "zod";
import { randomUUID } from "crypto";

/**
 * T023: Delete (soft delete) event with attendance check
 * Phase 3.4 - Server Actions - Event Management
 *
 * Requirements:
 * - Admin and Moderator can delete events
 * - Moderators can only delete events they created (FR-026)
 * - Cannot delete events with attendances (FR-020)
 * - Soft delete: set deletedAt, deletedBy relation
 * - Log SecurityLog: EVENT_DELETED
 *
 * @param eventId - ID of event to delete
 * @returns Success/error response
 */

const deleteEventSchema = z.object({
  eventId: z.string().cuid("Invalid event ID"),
});

export async function deleteEvent(eventId: string) {
  try {
    // Require Administrator or Moderator role
    const user = await requireRole(["Administrator", "Moderator"]);

    // Validate input
    const validatedData = deleteEventSchema.parse({ eventId });

    // Fetch event to check ownership and attendance status
    const event = await db.event.findUnique({
      where: { id: validatedData.eventId },
      select: {
        id: true,
        name: true,
        createdById: true,
        hasAttendances: true,
        deletedAt: true,
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

    // Check if already soft deleted
    if (event.deletedAt) {
      return {
        success: false,
        error: "Event is already deleted",
      };
    }

    // Moderator scope: can only delete own events (FR-026)
    if (user.role === "Moderator" && event.createdById !== user.userId) {
      return {
        success: false,
        error: "Forbidden: You can only delete events you created",
      };
    }

    // Prevent deletion if event has attendances (FR-020)
    if (event.hasAttendances || event._count.Attendance > 0) {
      return {
        success: false,
        error:
          "Cannot delete event with attendance records. This prevents data integrity issues.",
      };
    }

    // Soft delete the event
    await db.event.update({
      where: { id: validatedData.eventId },
      data: {
        deletedAt: new Date(),
        User_Event_deletedByIdToUser: {
          connect: { id: user.userId },
        },
      },
    });

    // Log security event (FR-013)
    await db.securityLog.create({
      data: {
        id: randomUUID(),
        userId: user.userId,
        eventType: "EVENT_DELETED",
        ipAddress: "::1", // Default for server actions
        userAgent: "Server Action",
        success: true,
        metadata: {
          eventId: event.id,
          eventName: event.name,
          hadAttendances: event.hasAttendances,
          attendanceCount: event._count.Attendance,
        },
      },
    });

    return {
      success: true,
      message: `Event "${event.name}" deleted successfully`,
    };
  } catch (error) {
    // Log failed attempt
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues.map((issue) => issue.message).join(", "),
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: "Failed to delete event",
    };
  }
}
