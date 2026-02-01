/**
 * T031: Analytics Aggregation Functions
 * Phase 3.7 - Server Actions - Analytics
 * Provides data aggregation functions for the analytics dashboard
 */

import { db } from "@/lib/db";
import { VerificationStatus } from "@prisma/client";

// Export geolocation analytics
export { getAttendanceGeolocations } from "./geolocation";

/**
 * Get key metrics for the dashboard
 * Mirrors the moderator dashboard counting logic for consistency
 */
export async function getKeyMetrics(startDate: Date, endDate: Date) {
  // Build date filter for attendances within the range
  const attendanceDateFilter = {
    OR: [
      {
        checkInSubmittedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      {
        checkOutSubmittedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    ],
  };

  // Count total events (exclude soft-deleted)
  // Note: This counts ALL events, not filtered by date
  // This matches the moderator dashboard behavior for consistency
  const totalEvents = await db.event.count({
    where: {
      deletedAt: null,
    },
  });

  // Total attendances with activity in date range (only count Approved)
  const totalAttendances = await db.attendance.count({
    where: {
      ...attendanceDateFilter,
      verificationStatus: VerificationStatus.Approved,
    },
  });

  // Approved attendances (for verification rate calculation)
  const approvedCount = await db.attendance.count({
    where: {
      ...attendanceDateFilter,
      verificationStatus: VerificationStatus.Approved,
    },
  });

  // Pending attendances
  const pendingCount = await db.attendance.count({
    where: {
      ...attendanceDateFilter,
      verificationStatus: VerificationStatus.Pending,
    },
  });

  // Calculate verification rate (percentage of approved out of total)
  const verificationRate =
    totalAttendances > 0 ? (approvedCount / totalAttendances) * 100 : 0;

  return {
    totalEvents,
    totalAttendances,
    verificationRate: Math.round(verificationRate * 100) / 100, // Round to 2 decimals
    pendingCount,
  };
}

/**
 * Get attendance trends grouped by date
 */
export async function getAttendanceTrends(startDate: Date, endDate: Date) {
  const attendances = await db.attendance.findMany({
    where: {
      OR: [
        {
          checkInSubmittedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        {
          checkOutSubmittedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      ],
      verificationStatus: VerificationStatus.Approved,
    },
    select: {
      checkInSubmittedAt: true,
      checkOutSubmittedAt: true,
      Event: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      checkInSubmittedAt: "asc",
    },
  });

  // Group by date (use check-in date primarily, or check-out if check-in is missing)
  // Store event names for each date
  const trendMap = new Map<string, { count: number; events: Set<string> }>();

  for (const attendance of attendances) {
    const relevantDate =
      attendance.checkInSubmittedAt || attendance.checkOutSubmittedAt;
    if (!relevantDate) continue;

    const date = relevantDate.toISOString().split("T")[0];
    const current = trendMap.get(date) || {
      count: 0,
      events: new Set<string>(),
    };
    current.count += 1;
    current.events.add(attendance.Event.name);
    trendMap.set(date, current);
  }

  // Convert to array format for charts
  return Array.from(trendMap.entries())
    .map(([date, data]) => ({
      date,
      count: data.count,
      events: Array.from(data.events).sort(),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get top events by attendance count
 */
export async function getTopEvents(limit = 10) {
  const events = await db.event.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      _count: {
        select: {
          Attendance: {
            where: {
              verificationStatus: VerificationStatus.Approved,
            },
          },
        },
      },
    },
    orderBy: {
      Attendance: {
        _count: "desc",
      },
    },
    take: limit,
  });

  return events.map((event) => ({
    eventId: event.id,
    eventName: event.name,
    attendanceCount: event._count.Attendance,
    date: event.startDateTime,
  }));
}

/**
 * Get event status distribution
 */
export async function getEventStatusDistribution() {
  const distribution = await db.event.groupBy({
    by: ["status"],
    where: {
      deletedAt: null,
    },
    _count: {
      status: true,
    },
  });

  return distribution.map((item) => ({
    status: item.status,
    count: item._count.status,
  }));
}

/**
 * Get verification status distribution
 */
export async function getVerificationStatusDistribution(
  startDate: Date,
  endDate: Date,
) {
  const distribution = await db.attendance.groupBy({
    by: ["verificationStatus"],
    where: {
      OR: [
        {
          checkInSubmittedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        {
          checkOutSubmittedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      ],
    },
    _count: {
      verificationStatus: true,
    },
  });

  return distribution.map((item) => ({
    status: item.verificationStatus,
    count: item._count.verificationStatus,
  }));
}

/**
 * Get department breakdown (approved attendances)
 */
export async function getDepartmentBreakdown(startDate: Date, endDate: Date) {
  const attendances = await db.attendance.findMany({
    where: {
      OR: [
        {
          checkInSubmittedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        {
          checkOutSubmittedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      ],
      verificationStatus: VerificationStatus.Approved,
    },
    select: {
      User_Attendance_userIdToUser: {
        select: {
          UserProfile: {
            select: {
              department: true,
            },
          },
        },
      },
    },
  });

  // Group by department
  const departmentMap = new Map<string, number>();

  for (const attendance of attendances) {
    const dept =
      attendance.User_Attendance_userIdToUser.UserProfile?.department ||
      "Unknown";
    departmentMap.set(dept, (departmentMap.get(dept) || 0) + 1);
  }

  // Convert to array and sort by count
  return Array.from(departmentMap.entries())
    .map(([department, count]) => ({
      department,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get course breakdown (approved attendances)
 * Note: Using department since there's no course field in UserProfile
 */
export async function getCourseBreakdown(startDate: Date, endDate: Date) {
  // Since there's no course field in the schema, we'll use department
  // This can be updated when course field is added to UserProfile
  return getDepartmentBreakdown(startDate, endDate);
}
