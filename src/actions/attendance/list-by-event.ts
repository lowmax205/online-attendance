"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth/server";

interface ListAttendanceFilters {
  status?: "Pending" | "Approved" | "Rejected";
  page?: number;
  limit?: number;
}

/**
 * List all attendance records for an event
 * @param eventId - Event ID
 * @param filters - Optional filters for status and pagination
 * @returns Paginated list of attendance records
 */
export async function listAttendanceByEvent(
  eventId: string,
  filters: ListAttendanceFilters = {},
) {
  try {
    // Require authentication
    await requireAuth();

    const { status, page = 1, limit = 20 } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: {
      eventId: string;
      verificationStatus?: "Pending" | "Approved" | "Rejected";
    } = { eventId };

    if (status) {
      where.verificationStatus = status;
    }

    // Get total count
    const total = await db.attendance.count({ where });

    // Get attendance records with user information
    const attendances = await db.attendance.findMany({
      where,
      include: {
        User_Attendance_userIdToUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            UserProfile: {
              select: {
                studentId: true,
                department: true,
                yearLevel: true,
                section: true,
              },
            },
          },
        },
        User_Attendance_verifiedByIdToUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        checkInSubmittedAt: "desc",
      },
      skip,
      take: limit,
    });

    return {
      success: true,
      data: {
        attendances,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
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
      error: "Failed to list attendance records",
    };
  }
}
