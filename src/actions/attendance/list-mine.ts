"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth/server";
import {
  attendanceUserListQuerySchema,
  type AttendanceUserListQuery,
} from "@/lib/validations/attendance-verification";
import { Prisma } from "@prisma/client";
import { z } from "zod";

export async function listMyAttendances(
  query: Partial<AttendanceUserListQuery> = {},
) {
  try {
    const user = await requireAuth();
    const validatedQuery = attendanceUserListQuerySchema.parse(query);
    const skip = (validatedQuery.page - 1) * validatedQuery.limit;

    const baseFilters: Prisma.AttendanceWhereInput[] = [
      { userId: user.userId },
    ];

    if (validatedQuery.startDate || validatedQuery.endDate) {
      const dateFilter: Prisma.AttendanceWhereInput = {};
      const range: Prisma.DateTimeFilter = {};

      if (validatedQuery.startDate) {
        range.gte = new Date(validatedQuery.startDate);
      }

      if (validatedQuery.endDate) {
        range.lte = new Date(validatedQuery.endDate);
      }

      dateFilter.checkInSubmittedAt = range;
      baseFilters.push(dateFilter);
    }

    if (validatedQuery.search) {
      const searchTerm = validatedQuery.search.trim();
      baseFilters.push({
        Event: {
          name: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
      });
    }

    const listFilters = [...baseFilters];

    if (validatedQuery.status) {
      listFilters.push({ verificationStatus: validatedQuery.status });
    }

    const listWhere: Prisma.AttendanceWhereInput = {
      AND: listFilters,
    };

    const total = await db.attendance.count({ where: listWhere });

    // Get status counts in a single aggregation query instead of three separate count calls
    const statusCounts = await db.attendance.groupBy({
      by: ["verificationStatus"],
      where: baseFilters.length > 0 ? { AND: baseFilters } : {},
      _count: true,
    });

    const countMap = statusCounts.reduce(
      (acc, item) => {
        acc[item.verificationStatus] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    const totalPending = countMap["Pending"] || 0;
    const totalApproved = countMap["Approved"] || 0;
    const totalRejected = countMap["Rejected"] || 0;

    let orderBy: Prisma.AttendanceOrderByWithRelationInput;
    if (validatedQuery.sortBy === "eventName") {
      orderBy = {
        Event: {
          name: validatedQuery.sortOrder,
        },
      };
    } else {
      orderBy = {
        [validatedQuery.sortBy]: validatedQuery.sortOrder,
      } as Prisma.AttendanceOrderByWithRelationInput;
    }

    const attendances = await db.attendance.findMany({
      where: listWhere,
      include: {
        Event: {
          select: {
            id: true,
            name: true,
            startDateTime: true,
            venueName: true,
          },
        },
        User_Attendance_userIdToUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
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
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy,
      skip,
      take: validatedQuery.limit,
    });

    return {
      success: true,
      data: {
        attendances,
        pagination: {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          total,
          totalPages: Math.ceil(total / validatedQuery.limit),
        },
        summary: {
          totalPending,
          totalApproved,
          totalRejected,
        },
      },
    };
  } catch (error) {
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
      error: "Failed to list attendance records",
    };
  }
}
