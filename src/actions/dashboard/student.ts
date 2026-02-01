"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/server";
import { getCachedStudentStats, getCachedUpcomingEvents } from "@/lib/cache";

interface StudentDashboardParams {
  page?: number;
  limit?: number;
  status?: "Pending" | "Approved" | "Rejected";
}

/**
 * Get student dashboard data
 * Optimized with caching for stats and upcoming events
 * @param params - Pagination and filter parameters
 * @returns Student attendance history, upcoming events, and statistics
 */
export async function getStudentDashboard(params: StudentDashboardParams = {}) {
  try {
    // Require Student role (or higher)
    const user = await requireRole(["Student", "Moderator", "Administrator"]);

    const { page = 1, limit = 20, status } = params;
    const skip = (page - 1) * limit;

    // Build where clause for attendance history
    const where: {
      userId: string;
      verificationStatus?: "Pending" | "Approved" | "Rejected";
    } = { userId: user.userId };

    if (status) {
      where.verificationStatus = status;
    }

    // Parallel fetch: attendance history, cached stats, and cached upcoming events
    const [totalItems, attendanceHistory, stats, upcomingEvents] =
      await Promise.all([
        // Count for pagination
        db.attendance.count({ where }),
        // Paginated attendance history
        db.attendance.findMany({
          where,
          include: {
            Event: {
              select: {
                name: true,
                startDateTime: true,
              },
            },
          },
          orderBy: {
            checkInSubmittedAt: "desc",
          },
          skip,
          take: limit,
        }),
        // Cached stats (reduces 4+ DB calls to 1 with caching)
        getCachedStudentStats(user.userId),
        // Cached upcoming events (shared cache across all students)
        getCachedUpcomingEvents(),
      ]);

    return {
      success: true,
      data: {
        attendanceHistory: attendanceHistory.map((attendance) => ({
          id: attendance.id,
          eventName: attendance.Event.name,
          eventStartDateTime: attendance.Event.startDateTime,
          checkInSubmittedAt: attendance.checkInSubmittedAt,
          checkOutSubmittedAt: attendance.checkOutSubmittedAt,
          verificationStatus: attendance.verificationStatus,
          disputeNote: attendance.disputeNote,
        })),
        upcomingEvents: upcomingEvents.slice(0, 5), // Limit to 5 for dashboard
        stats,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages: Math.ceil(totalItems / limit),
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
      error: "Failed to load student dashboard",
    };
  }
}
