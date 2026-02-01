"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/server";
import { randomUUID } from "crypto";
import {
  getKeyMetrics,
  getAttendanceTrends,
  getTopEvents,
  getEventStatusDistribution,
  getVerificationStatusDistribution,
  getDepartmentBreakdown,
  getCourseBreakdown,
  getAttendanceGeolocations,
} from "@/lib/analytics/aggregations";
import { analyticsQuerySchema } from "@/lib/validations/analytics";
import { z } from "zod";

interface AdminDashboardParams {
  page?: number;
  limit?: number;
}

/**
 * Get administrator dashboard data
 * @param params - Pagination parameters
 * @returns System-wide statistics, recent activity, and alerts
 */
export async function getAdminDashboard(params: AdminDashboardParams = {}) {
  try {
    // Require Administrator role
    await requireRole(["Administrator"]);

    const { page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    // Get system statistics
    const totalUsers = await db.user.count();
    const totalEvents = await db.event.count();
    const totalAttendance = await db.attendance.count();

    const activeEvents = await db.event.count({
      where: { status: "Active" },
    });

    const pendingVerifications = await db.attendance.count({
      where: { verificationStatus: "Pending" },
    });

    // Get recent activity from SecurityLog (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const totalActivityItems = await db.securityLog.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    const recentActivity = await db.securityLog.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      include: {
        User: {
          select: {
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    // Generate alerts based on thresholds
    const alerts = [];

    // Alert: Pending verifications backlog
    if (pendingVerifications > 50) {
      alerts.push({
        severity: "warning" as const,
        message: "Large backlog of pending verifications",
        count: pendingVerifications,
      });
    }

    // Alert: System activity (info)
    alerts.push({
      severity: "info" as const,
      message: "System operational",
      count: 1,
    });

    // Format recent activity
    const formattedActivity = recentActivity.map((log) => ({
      id: log.id,
      action: log.eventType,
      timestamp: log.createdAt,
      userId: log.userId,
      userEmail: log.User?.email || "Unknown",
      details:
        typeof log.metadata === "object" && log.metadata !== null
          ? JSON.stringify(log.metadata)
          : "No details",
    }));

    return {
      success: true,
      data: {
        systemStats: {
          totalUsers,
          totalEvents,
          totalAttendance,
          activeEvents,
          pendingVerifications,
        },
        recentActivity: formattedActivity,
        alerts,
        pagination: {
          page,
          limit,
          totalItems: totalActivityItems,
          totalPages: Math.ceil(totalActivityItems / limit),
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
      error: "Failed to load administrator dashboard",
    };
  }
}

/**
 * Get analytics dashboard data with optional caching
 * T032: Analytics Dashboard Endpoint
 */
export async function getAnalyticsDashboard(input: {
  startDate?: string;
  endDate?: string;
  refresh?: boolean;
}) {
  try {
    const user = await requireRole(["Administrator", "Moderator"]);

    // Validate input
    const validatedInput = analyticsQuerySchema.parse(input);
    const startDate = validatedInput.startDate
      ? new Date(validatedInput.startDate)
      : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const endDate = validatedInput.endDate
      ? new Date(validatedInput.endDate)
      : new Date();

    const startTime = Date.now();
    const cacheHit = false;

    // Note: Redis caching skipped - not configured in this project
    // Future enhancement: Implement Redis with cache key format:
    // `analytics:dashboard:${startDate.toISOString()}:${endDate.toISOString()}`

    // Call all aggregation functions in parallel
    const [
      keyMetrics,
      attendanceTrends,
      topEvents,
      eventStatusDist,
      verificationStatusDist,
      departmentBreakdown,
      courseBreakdown,
      geolocations,
    ] = await Promise.all([
      getKeyMetrics(startDate, endDate),
      getAttendanceTrends(startDate, endDate),
      getTopEvents(10),
      getEventStatusDistribution(),
      getVerificationStatusDistribution(startDate, endDate),
      getDepartmentBreakdown(startDate, endDate),
      getCourseBreakdown(startDate, endDate),
      getAttendanceGeolocations(startDate, endDate),
    ]);

    const queryTimeMs = Date.now() - startTime;

    // Optionally log analytics access (captures moderator read-only views too)
    await db.securityLog.create({
      data: {
        id: randomUUID(),
        userId: user.userId,
        eventType: "ANALYTICS_ACCESSED",
        ipAddress: "system",
        userAgent: "Server Action",
        metadata: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          queryTimeMs,
          role: user.role,
        },
      },
    });

    return {
      success: true,
      data: {
        keyMetrics,
        charts: {
          attendanceTrends: {
            data: attendanceTrends,
          },
          topEvents: {
            data: topEvents,
          },
          eventStatusDistribution: {
            data: eventStatusDist,
          },
          verificationStatusDistribution: {
            data: verificationStatusDist,
          },
          departmentBreakdown: {
            data: departmentBreakdown,
          },
          courseBreakdown: {
            data: courseBreakdown,
          },
          geolocationMap: {
            data: geolocations,
          },
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          cacheHit,
          queryTimeMs,
          dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
        },
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid input data",
        details: error.issues,
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
      error: "Failed to load analytics dashboard",
    };
  }
}
