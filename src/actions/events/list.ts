"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth/server";
import { checkAndUpdateExpiredEvents } from "@/lib/events/status-monitor";
import {
  eventListQuerySchema,
  type EventListQuery,
} from "@/lib/validations/event-management";
import { EventStatus, Prisma } from "@prisma/client";

/**
 * T020: List events with moderator scope filtering and enhanced pagination
 * Phase 3.4 - Extended from Phase 2
 * @param query - Query parameters (pagination, filters, sorting)
 * @returns Paginated list of events
 */
export async function listEvents(query: Partial<EventListQuery> = {}) {
  try {
    // Require authentication (MODERATOR or ADMIN)
    const user = await requireAuth();

    // Ensure event statuses reflect current schedule before querying
    await checkAndUpdateExpiredEvents().catch((error) => {
      console.error("Failed to refresh event statuses:", error);
    });

    // Validate and parse query parameters
    const validatedQuery = eventListQuerySchema.parse(query);

    const skip = (validatedQuery.page - 1) * validatedQuery.limit;

    const baseFilters: Prisma.EventWhereInput[] = [{ deletedAt: null }];

    if (validatedQuery.scope === "mine") {
      baseFilters.push({ createdById: user.userId });
    }

    if (validatedQuery.search) {
      const searchTerm = validatedQuery.search.trim();
      baseFilters.push({
        OR: [
          {
            name: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            venueName: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        ],
      });
    }

    if (validatedQuery.startDate || validatedQuery.endDate) {
      const dateFilter: Prisma.EventWhereInput = {};
      const range: Prisma.DateTimeFilter = {};

      if (validatedQuery.startDate) {
        range.gte = new Date(validatedQuery.startDate);
      }

      if (validatedQuery.endDate) {
        range.lte = new Date(validatedQuery.endDate);
      }

      dateFilter.startDateTime = range;
      baseFilters.push(dateFilter);
    }

    const listFilters = [...baseFilters];

    if (validatedQuery.status) {
      listFilters.push({ status: validatedQuery.status });
    }

    const where =
      listFilters.length > 0
        ? ({ AND: listFilters } satisfies Prisma.EventWhereInput)
        : {};

    // Get total count
    const total = await db.event.count({ where });

    const statusWhere = (status: EventStatus) =>
      baseFilters.length > 0
        ? { AND: [...baseFilters, { status }] }
        : { status };

    const activeCountPromise =
      !validatedQuery.status || validatedQuery.status === EventStatus.Active
        ? db.event.count({ where: statusWhere(EventStatus.Active) })
        : Promise.resolve(0);

    const completedCountPromise =
      !validatedQuery.status || validatedQuery.status === EventStatus.Completed
        ? db.event.count({ where: statusWhere(EventStatus.Completed) })
        : Promise.resolve(0);

    const cancelledCountPromise =
      !validatedQuery.status || validatedQuery.status === EventStatus.Cancelled
        ? db.event.count({ where: statusWhere(EventStatus.Cancelled) })
        : Promise.resolve(0);

    const upcomingCountPromise =
      !validatedQuery.status || validatedQuery.status === EventStatus.Active
        ? db.event.count({
            where:
              baseFilters.length > 0
                ? {
                    AND: [
                      ...baseFilters,
                      { status: EventStatus.Active },
                      {
                        startDateTime: {
                          gte: new Date(),
                        },
                      },
                    ],
                  }
                : {
                    status: EventStatus.Active,
                    startDateTime: {
                      gte: new Date(),
                    },
                  },
          })
        : Promise.resolve(0);

    const [totalActive, totalCompleted, totalCancelled, upcomingEvents] =
      await Promise.all([
        activeCountPromise,
        completedCountPromise,
        cancelledCountPromise,
        upcomingCountPromise,
      ]);

    // Get events with creator information
    const events = await db.event.findMany({
      where,
      include: {
        User_Event_createdByIdToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            Attendance: true,
          },
        },
      },
      orderBy: {
        [validatedQuery.sortBy]: validatedQuery.sortOrder,
      },
      skip,
      take: validatedQuery.limit,
    });

    return {
      success: true,
      data: {
        events,
        pagination: {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          total,
          totalPages: Math.ceil(total / validatedQuery.limit),
        },
        summary: {
          totalActive,
          totalCompleted,
          totalCancelled,
          upcomingEvents,
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
      error: "Failed to list events",
    };
  }
}
