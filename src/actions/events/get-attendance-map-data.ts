"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth/server";

/**
 * Get attendance geolocation data for an event with pagination and aggregated counts
 * @param eventId - Event ID
 * @param page - Page number (default 1)
 * @param limit - Records per page (default 50, max 200)
 * @returns Paginated attendance records with coordinates and verification status summary
 */
export async function getAttendanceMapData(
  eventId: string,
  page = 1,
  limit = 50,
) {
  try {
    // Require authentication
    await requireAuth();

    // Enforce limits to prevent memory exhaustion
    const effectiveLimit = Math.min(Math.max(limit, 10), 200);
    const skip = (page - 1) * effectiveLimit;

    // Get total count
    const totalCount = await db.attendance.count({
      where: { eventId },
    });

    // Get paginated attendance records with coordinates (minimal fields)
    const attendances = await db.attendance.findMany({
      where: {
        eventId,
        OR: [
          { checkInLatitude: { not: null } },
          { checkOutLatitude: { not: null } },
        ],
      },
      select: {
        id: true,
        checkInLatitude: true,
        checkInLongitude: true,
        checkOutLatitude: true,
        checkOutLongitude: true,
        checkInDistance: true,
        checkOutDistance: true,
        verificationStatus: true,
        User_Attendance_userIdToUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      skip,
      take: effectiveLimit,
      orderBy: {
        checkInSubmittedAt: "desc",
      },
    });

    // Get verification status counts in single aggregation query
    const verificationCounts = await db.attendance.groupBy({
      by: ["verificationStatus"],
      where: { eventId },
      _count: true,
    });

    const countMap = verificationCounts.reduce(
      (acc, item) => {
        acc[item.verificationStatus] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      success: true,
      data: {
        attendances: attendances.map((a) => ({
          id: a.id,
          checkInLatitude: a.checkInLatitude,
          checkInLongitude: a.checkInLongitude,
          checkOutLatitude: a.checkOutLatitude,
          checkOutLongitude: a.checkOutLongitude,
          checkInDistance: a.checkInDistance,
          checkOutDistance: a.checkOutDistance,
          verificationStatus: a.verificationStatus,
          userName:
            `${a.User_Attendance_userIdToUser.firstName || ""} ${a.User_Attendance_userIdToUser.lastName || ""}`.trim() ||
            a.User_Attendance_userIdToUser.email,
        })),
        verificationSummary: {
          approved: countMap["Approved"] || 0,
          pending: countMap["Pending"] || 0,
          rejected: countMap["Rejected"] || 0,
          total: totalCount,
        },
        pagination: {
          page,
          limit: effectiveLimit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / effectiveLimit),
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
      error: "Failed to get attendance map data",
    };
  }
}
