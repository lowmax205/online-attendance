/**
 * Caching utilities for optimizing database queries
 * Uses Next.js unstable_cache for server-side request deduplication and caching
 */

import { unstable_cache } from "next/cache";
import { cache } from "react";
import { db } from "@/lib/db";
import { VerificationStatus, EventStatus } from "@prisma/client";

/**
 * Cache durations in seconds
 */
export const CACHE_DURATIONS = {
  /** Very short - for real-time data like pending counts */
  REALTIME: 30,
  /** Short - for dashboard stats that update frequently */
  SHORT: 60,
  /** Medium - for analytics and aggregations */
  MEDIUM: 300,
  /** Long - for rarely changing data like event lists */
  LONG: 900,
  /** Very long - for static/reference data */
  STATIC: 3600,
} as const;

/**
 * Cache tags for invalidation
 */
export const CACHE_TAGS = {
  EVENTS: "events",
  ATTENDANCE: "attendance",
  USERS: "users",
  ANALYTICS: "analytics",
  SESSION: "session",
} as const;

// =============================================================================
// SESSION CACHING
// =============================================================================

/**
 * Cached user session lookup - reduces DB calls for session validation
 * Short cache duration since session data should be relatively fresh
 */
export const getCachedUserSession = unstable_cache(
  async (userId: string) => {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        accountStatus: true,
        UserProfile: {
          select: {
            id: true,
            profilePictureUrl: true,
          },
        },
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      hasProfile: !!user.UserProfile,
      profilePictureUrl: user.UserProfile?.profilePictureUrl ?? null,
    };
  },
  ["user-session"],
  {
    revalidate: CACHE_DURATIONS.SHORT,
    tags: [CACHE_TAGS.SESSION],
  },
);

// =============================================================================
// DASHBOARD STATS CACHING
// =============================================================================

/**
 * Get aggregated attendance status counts using groupBy instead of multiple counts
 * This reduces 4 separate DB calls to 1
 */
export async function getAttendanceStatusCounts(filters?: {
  userId?: string;
  eventId?: string;
  eventCreatedById?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const where: Parameters<typeof db.attendance.groupBy>[0]["where"] = {};

  if (filters?.userId) {
    where.userId = filters.userId;
  }

  if (filters?.eventId) {
    where.eventId = filters.eventId;
  }

  if (filters?.eventCreatedById) {
    where.Event = { createdById: filters.eventCreatedById };
  }

  if (filters?.startDate || filters?.endDate) {
    where.checkInSubmittedAt = {};
    if (filters.startDate) {
      where.checkInSubmittedAt.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.checkInSubmittedAt.lte = filters.endDate;
    }
  }

  const statusCounts = await db.attendance.groupBy({
    by: ["verificationStatus"],
    where,
    _count: {
      verificationStatus: true,
    },
  });

  // Transform to a more usable format
  const result = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  for (const item of statusCounts) {
    const count = item._count.verificationStatus;
    result.total += count;

    switch (item.verificationStatus) {
      case VerificationStatus.Pending:
        result.pending = count;
        break;
      case VerificationStatus.Approved:
        result.approved = count;
        break;
      case VerificationStatus.Rejected:
        result.rejected = count;
        break;
    }
  }

  return result;
}

/**
 * Cached version of attendance status counts
 */
export const getCachedAttendanceStatusCounts = unstable_cache(
  getAttendanceStatusCounts,
  ["attendance-status-counts"],
  {
    revalidate: CACHE_DURATIONS.SHORT,
    tags: [CACHE_TAGS.ATTENDANCE],
  },
);

/**
 * Get aggregated event status counts using groupBy
 */
export async function getEventStatusCounts(filters?: { createdById?: string }) {
  const where: Parameters<typeof db.event.groupBy>[0]["where"] = {
    deletedAt: null,
  };

  if (filters?.createdById) {
    where.createdById = filters.createdById;
  }

  const statusCounts = await db.event.groupBy({
    by: ["status"],
    where,
    _count: {
      status: true,
    },
  });

  const result = {
    total: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
  };

  for (const item of statusCounts) {
    const count = item._count.status;
    result.total += count;

    switch (item.status) {
      case EventStatus.Active:
        result.active = count;
        break;
      case EventStatus.Completed:
        result.completed = count;
        break;
      case EventStatus.Cancelled:
        result.cancelled = count;
        break;
    }
  }

  return result;
}

/**
 * Cached version of event status counts
 */
export const getCachedEventStatusCounts = unstable_cache(
  getEventStatusCounts,
  ["event-status-counts"],
  {
    revalidate: CACHE_DURATIONS.SHORT,
    tags: [CACHE_TAGS.EVENTS],
  },
);

// =============================================================================
// STUDENT DASHBOARD CACHING
// =============================================================================

/**
 * Get cached student dashboard statistics
 */
export const getCachedStudentStats = unstable_cache(
  async (userId: string) => {
    const [attendanceCounts, totalEvents] = await Promise.all([
      getAttendanceStatusCounts({ userId }),
      db.event.count({
        where: { status: { in: [EventStatus.Active, EventStatus.Completed] } },
      }),
    ]);

    const attendanceRate =
      totalEvents > 0 ? (attendanceCounts.approved / totalEvents) * 100 : 0;

    return {
      totalAttendance: attendanceCounts.total,
      approvedCount: attendanceCounts.approved,
      pendingCount: attendanceCounts.pending,
      rejectedCount: attendanceCounts.rejected,
      attendanceRate: parseFloat(attendanceRate.toFixed(2)),
    };
  },
  ["student-dashboard-stats"],
  {
    revalidate: CACHE_DURATIONS.SHORT,
    tags: [CACHE_TAGS.ATTENDANCE],
  },
);

/**
 * Get cached upcoming events (shared across all students)
 */
export const getCachedUpcomingEvents = unstable_cache(
  async () => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return db.event.findMany({
      where: {
        status: EventStatus.Active,
        startDateTime: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
      select: {
        id: true,
        name: true,
        startDateTime: true,
        venueName: true,
        qrCodeUrl: true,
      },
      orderBy: {
        startDateTime: "asc",
      },
      take: 10,
    });
  },
  ["upcoming-events"],
  {
    revalidate: CACHE_DURATIONS.MEDIUM,
    tags: [CACHE_TAGS.EVENTS],
  },
);

// =============================================================================
// MODERATOR DASHBOARD CACHING
// =============================================================================

/**
 * Get cached moderator dashboard statistics
 */
export const getCachedModeratorStats = unstable_cache(
  async (userId: string, isModerator: boolean) => {
    const eventFilter = isModerator ? { createdById: userId } : {};

    const [eventCounts, attendanceCounts] = await Promise.all([
      getEventStatusCounts(eventFilter),
      getAttendanceStatusCounts(
        isModerator ? { eventCreatedById: userId } : undefined,
      ),
    ]);

    return {
      totalEvents: eventCounts.total,
      activeEvents: eventCounts.active,
      totalAttendance: attendanceCounts.total,
      pendingVerifications: attendanceCounts.pending,
    };
  },
  ["moderator-dashboard-stats"],
  {
    revalidate: CACHE_DURATIONS.SHORT,
    tags: [CACHE_TAGS.EVENTS, CACHE_TAGS.ATTENDANCE],
  },
);

/**
 * Get cached admin system statistics
 */
export const getCachedAdminSystemStats = unstable_cache(
  async () => {
    const totalUsers = await db.user.count({ where: { deletedAt: null } });

    return {
      totalUsers,
    };
  },
  ["admin-system-stats"],
  {
    revalidate: CACHE_DURATIONS.MEDIUM,
    tags: [CACHE_TAGS.USERS],
  },
);

// =============================================================================
// ANALYTICS CACHING
// =============================================================================

/**
 * Cached key metrics for analytics dashboard
 */
export const getCachedKeyMetrics = unstable_cache(
  async (startDate: Date, endDate: Date) => {
    const attendanceDateFilter = {
      OR: [
        { checkInSubmittedAt: { gte: startDate, lte: endDate } },
        { checkOutSubmittedAt: { gte: startDate, lte: endDate } },
      ],
    };

    const [totalEvents, attendanceCounts] = await Promise.all([
      db.event.count({ where: { deletedAt: null } }),
      db.attendance.groupBy({
        by: ["verificationStatus"],
        where: attendanceDateFilter,
        _count: { verificationStatus: true },
      }),
    ]);

    let totalAttendances = 0;
    let approvedCount = 0;
    let pendingCount = 0;

    for (const item of attendanceCounts) {
      totalAttendances += item._count.verificationStatus;
      if (item.verificationStatus === VerificationStatus.Approved) {
        approvedCount = item._count.verificationStatus;
      }
      if (item.verificationStatus === VerificationStatus.Pending) {
        pendingCount = item._count.verificationStatus;
      }
    }

    const verificationRate =
      totalAttendances > 0 ? (approvedCount / totalAttendances) * 100 : 0;

    return {
      totalEvents,
      totalAttendances,
      verificationRate: Math.round(verificationRate * 100) / 100,
      pendingCount,
    };
  },
  ["analytics-key-metrics"],
  {
    revalidate: CACHE_DURATIONS.MEDIUM,
    tags: [CACHE_TAGS.ANALYTICS],
  },
);

/**
 * Cached department breakdown using database aggregation
 */
export const getCachedDepartmentBreakdown = unstable_cache(
  async (startDate: Date, endDate: Date) => {
    // Use raw query for better performance with aggregation
    const breakdown = await db.$queryRaw<
      Array<{ department: string; count: bigint }>
    >`
      SELECT
        COALESCE(up."department"::text, 'Unknown') as department,
        COUNT(*) as count
      FROM "Attendance" a
      INNER JOIN "User" u ON a."userId" = u."id"
      LEFT JOIN "UserProfile" up ON u."id" = up."userId"
      WHERE a."verificationStatus" = 'Approved'
        AND (
          (a."checkInSubmittedAt" >= ${startDate} AND a."checkInSubmittedAt" <= ${endDate})
          OR (a."checkOutSubmittedAt" >= ${startDate} AND a."checkOutSubmittedAt" <= ${endDate})
        )
      GROUP BY up."department"
      ORDER BY count DESC
    `;

    return breakdown.map((item) => ({
      department: item.department,
      count: Number(item.count),
    }));
  },
  ["department-breakdown"],
  {
    revalidate: CACHE_DURATIONS.MEDIUM,
    tags: [CACHE_TAGS.ANALYTICS],
  },
);

// =============================================================================
// REQUEST-LEVEL DEDUPLICATION
// =============================================================================

/**
 * Request-level cache for current user (prevents duplicate DB calls in same request)
 * Uses React's cache() for request memoization
 */
export const getRequestUser = cache(async (userId: string) => {
  return db.user.findUnique({
    where: { id: userId },
    include: { UserProfile: true },
  });
});

// =============================================================================
// CACHE INVALIDATION HELPERS
// =============================================================================

import { revalidateTag, revalidatePath } from "next/cache";

/**
 * Invalidate all caches related to attendance
 */
export function invalidateAttendanceCache() {
  revalidateTag(CACHE_TAGS.ATTENDANCE);
  revalidateTag(CACHE_TAGS.ANALYTICS);
}

/**
 * Invalidate all caches related to events
 */
export function invalidateEventCache() {
  revalidateTag(CACHE_TAGS.EVENTS);
  revalidateTag(CACHE_TAGS.ANALYTICS);
}

/**
 * Invalidate user session cache
 */
export function invalidateUserCache(userId?: string) {
  revalidateTag(CACHE_TAGS.SESSION);
  revalidateTag(CACHE_TAGS.USERS);
  if (userId) {
    revalidatePath("/profile");
    revalidatePath("/dashboard");
  }
}

/**
 * Invalidate all dashboard caches
 */
export function invalidateDashboardCache() {
  revalidateTag(CACHE_TAGS.EVENTS);
  revalidateTag(CACHE_TAGS.ATTENDANCE);
  revalidateTag(CACHE_TAGS.ANALYTICS);
}
