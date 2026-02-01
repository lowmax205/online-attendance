"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/server";
import {
  getCachedModeratorStats,
  getCachedAdminSystemStats,
} from "@/lib/cache";

interface UnifiedDashboardParams {
  page?: number;
  limit?: number;
  status?: "Active" | "Completed" | "Cancelled";
  activityPage?: number;
  activityLimit?: number;
}

/**
 * Get unified dashboard data for Moderator and Administrator
 * Moderators see only their events, Admins see all events
 *
 * Optimizations:
 * - Removed checkAndUpdateExpiredEvents from hot path (moved to background job)
 * - Uses cached statistics to reduce DB calls
 * - Parallel data fetching where possible
 *
 * @param params - Pagination and filter parameters
 * @returns Dashboard data tailored to user role
 */
export async function getModeratorDashboard(
  params: UnifiedDashboardParams = {},
) {
  try {
    // Require Moderator or Administrator role
    const user = await requireRole(["Moderator", "Administrator"]);

    const {
      page = 1,
      limit = 20,
      status,
      activityPage = 1,
      activityLimit = 10,
    } = params;
    const skip = (page - 1) * limit;
    const activitySkip = (activityPage - 1) * activityLimit;

    const isModerator = user.role === "Moderator";
    const isAdmin = user.role === "Administrator";

    // NOTE: Event status updates are now handled by a background job/API route
    // This improves dashboard load performance significantly

    // Build where clause - Moderators see only their events, Admins see all
    const eventWhere: {
      createdById?: string;
      status?: "Active" | "Completed" | "Cancelled";
    } = {};

    if (isModerator) {
      eventWhere.createdById = user.userId;
    }

    if (status) {
      eventWhere.status = status;
    }

    // Parallel fetch for performance - use cached stats where possible
    const [totalItems, myEvents, stats, systemStats, activityTotal] =
      await Promise.all([
        // Event count for pagination
        db.event.count({ where: eventWhere }),
        // Paginated events with attendance counts
        db.event.findMany({
          where: eventWhere,
          select: {
            id: true,
            name: true,
            startDateTime: true,
            endDateTime: true,
            status: true,
            User_Event_createdByIdToUser: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            _count: {
              select: {
                Attendance: true,
              },
            },
            Attendance: {
              where: {
                verificationStatus: "Pending",
              },
              select: {
                id: true,
              },
            },
          },
          orderBy: {
            startDateTime: "desc",
          },
          skip,
          take: limit,
        }),
        // Cached moderator stats (reduces 4+ DB calls to 1)
        getCachedModeratorStats(user.userId, isModerator),
        // Cached admin stats (only for admins)
        isAdmin ? getCachedAdminSystemStats() : Promise.resolve(null),
        // Activity log count for pagination
        db.securityLog.count({
          where: {
            createdAt: {
              gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000), // Always 30 days
            },
            ...(isModerator ? { userId: user.userId } : {}),
          },
        }),
      ]);

    // Get recent activity
    const recentActivity = await (async () => {
      const activityStartDate = new Date();
      activityStartDate.setDate(activityStartDate.getDate() - 30); // Always last 30 days

      const recentActivityWhere: {
        createdAt: { gte: Date };
        userId?: string;
      } = {
        createdAt: {
          gte: activityStartDate,
        },
      };

      // Moderators only see their own activity
      if (isModerator) {
        recentActivityWhere.userId = user.userId;
      }

      return db.securityLog.findMany({
        where: recentActivityWhere,
        include: {
          User: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: activitySkip,
        take: activityLimit,
      });
    })();

    // Format response
    const formattedEvents = myEvents.map((event) => ({
      id: event.id,
      name: event.name,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      status: event.status,
      attendanceCount: event._count.Attendance,
      pendingCount: event.Attendance.length,
      creatorName: `${event.User_Event_createdByIdToUser.firstName} ${event.User_Event_createdByIdToUser.lastName}`,
    }));

    const formattedActivity = recentActivity.map((log) => ({
      id: log.id,
      action: log.eventType,
      timestamp: log.createdAt,
      userId: log.userId,
      userName: log.User
        ? `${log.User.firstName} ${log.User.lastName}`
        : "System",
      userEmail: log.User?.email || "N/A",
      details:
        typeof log.metadata === "object" && log.metadata !== null
          ? JSON.stringify(log.metadata)
          : null,
      success: log.success,
    }));

    return {
      success: true,
      data: {
        myEvents: formattedEvents,
        recentActivity: formattedActivity,
        stats: {
          totalEvents: stats.totalEvents,
          activeEvents: stats.activeEvents,
          totalAttendance: stats.totalAttendance,
        },
        systemStats, // Only populated for Admins
        userRole: user.role,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages: Math.ceil(totalItems / limit),
        },
        activityPagination: {
          page: activityPage,
          limit: activityLimit,
          totalItems: activityTotal,
          totalPages: Math.ceil(activityTotal / activityLimit),
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
      error: "Failed to load dashboard",
    };
  }
}
