"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/server";
import { invalidateAttendanceCache } from "@/lib/cache";
import {
  attendanceListQuerySchema,
  attendanceVerifySchema,
  type AttendanceListQuery,
} from "@/lib/validations/attendance-verification";
import { Prisma, VerificationStatus } from "@prisma/client";
import { z } from "zod";
import { randomUUID } from "crypto";

/**
 * T024: List attendances for moderator/admin with scope filtering
 * Phase 3.5 - Server Actions - Attendance Verification
 */
export async function listAttendances(
  query: Partial<AttendanceListQuery> = {},
) {
  try {
    const user = await requireRole(["Moderator", "Administrator"]);
    const validatedQuery = attendanceListQuerySchema.parse(query);
    const skip = (validatedQuery.page - 1) * validatedQuery.limit;

    const baseFilters: Prisma.AttendanceWhereInput[] = [];

    if (validatedQuery.myEventsOnly === true) {
      baseFilters.push({
        Event: {
          createdById: user.userId,
        },
      });
    }

    if (validatedQuery.eventId) {
      baseFilters.push({ eventId: validatedQuery.eventId });
    }

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

    if (validatedQuery.department) {
      baseFilters.push({
        User_Attendance_userIdToUser: {
          UserProfile: {
            is: {
              department: {
                equals: validatedQuery.department as
                  | "CCIS"
                  | "COE"
                  | "CAS"
                  | "CAAS"
                  | "CTE"
                  | "COT",
              },
            },
          },
        },
      });
    }

    if (validatedQuery.course) {
      baseFilters.push({
        User_Attendance_userIdToUser: {
          UserProfile: {
            is: {
              course: {
                contains: validatedQuery.course,
                mode: "insensitive",
              },
            },
          },
        },
      });
    }

    if (validatedQuery.search) {
      const searchTerm = validatedQuery.search.trim();
      baseFilters.push({
        OR: [
          {
            User_Attendance_userIdToUser: {
              firstName: {
                contains: searchTerm,
                mode: "insensitive",
              },
            },
          },
          {
            User_Attendance_userIdToUser: {
              lastName: {
                contains: searchTerm,
                mode: "insensitive",
              },
            },
          },
          {
            User_Attendance_userIdToUser: {
              email: {
                contains: searchTerm,
                mode: "insensitive",
              },
            },
          },
          {
            Event: {
              name: {
                contains: searchTerm,
                mode: "insensitive",
              },
            },
          },
        ],
      });
    }

    const listFilters = [...baseFilters];

    if (validatedQuery.status) {
      listFilters.push({ verificationStatus: validatedQuery.status });
    }

    const listWhere =
      listFilters.length > 0
        ? ({ AND: listFilters } satisfies Prisma.AttendanceWhereInput)
        : {};

    const total = await db.attendance.count({ where: listWhere });

    const pendingCountPromise =
      !validatedQuery.status ||
      validatedQuery.status === VerificationStatus.Pending
        ? db.attendance.count({
            where:
              baseFilters.length > 0
                ? {
                    AND: [
                      ...baseFilters,
                      { verificationStatus: VerificationStatus.Pending },
                    ],
                  }
                : { verificationStatus: VerificationStatus.Pending },
          })
        : Promise.resolve(0);

    const approvedCountPromise =
      !validatedQuery.status ||
      validatedQuery.status === VerificationStatus.Approved
        ? db.attendance.count({
            where:
              baseFilters.length > 0
                ? {
                    AND: [
                      ...baseFilters,
                      { verificationStatus: VerificationStatus.Approved },
                    ],
                  }
                : { verificationStatus: VerificationStatus.Approved },
          })
        : Promise.resolve(0);

    const rejectedCountPromise =
      !validatedQuery.status ||
      validatedQuery.status === VerificationStatus.Rejected
        ? db.attendance.count({
            where:
              baseFilters.length > 0
                ? {
                    AND: [
                      ...baseFilters,
                      { verificationStatus: VerificationStatus.Rejected },
                    ],
                  }
                : { verificationStatus: VerificationStatus.Rejected },
          })
        : Promise.resolve(0);

    const [totalPending, totalApproved, totalRejected] = await Promise.all([
      pendingCountPromise,
      approvedCountPromise,
      rejectedCountPromise,
    ]);

    const attendances = await db.attendance.findMany({
      where: listWhere,
      include: {
        User_Attendance_userIdToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            UserProfile: {
              select: {
                studentId: true,
                department: true,
                yearLevel: true,
                section: true,
                contactNumber: true,
              },
            },
          },
        },
        Event: {
          select: {
            id: true,
            name: true,
            startDateTime: true,
            endDateTime: true,
            venueName: true,
            status: true,
            User_Event_createdByIdToUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        User_Attendance_verifiedByIdToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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
      error: "Failed to list attendances",
    };
  }
}

/**
 * T025: Verify attendance (approve/reject) with scope check
 * Phase 3.5 - Server Actions - Attendance Verification
 */
export async function verifyAttendance(
  attendanceId: string,
  data: {
    status: VerificationStatus;
    disputeNotes?: string;
    resolutionNotes?: string;
  },
) {
  try {
    const user = await requireRole(["Moderator", "Administrator"]);
    const validatedData = attendanceVerifySchema.parse(data);
    const attendanceIdSchema = z.string().cuid("Invalid attendance ID");
    attendanceIdSchema.parse(attendanceId);

    const attendance = await db.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        Event: {
          select: {
            id: true,
            name: true,
            createdById: true,
          },
        },
        User_Attendance_userIdToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!attendance) {
      return {
        success: false,
        error: "Attendance record not found",
      };
    }

    if (
      user.role === "Moderator" &&
      attendance.Event.createdById !== user.userId
    ) {
      return {
        success: false,
        error:
          "Forbidden: You can only verify attendances for events you created",
      };
    }

    const updatedAttendance = await db.attendance.update({
      where: { id: attendanceId },
      data: {
        verificationStatus: validatedData.status,
        verifiedById: user.userId,
        verifiedAt: new Date(),
        ...(validatedData.disputeNotes && {
          disputeNote: validatedData.disputeNotes,
        }),
        ...(validatedData.resolutionNotes && {
          resolutionNotes: validatedData.resolutionNotes,
        }),
      },
    });

    const eventType =
      validatedData.status === VerificationStatus.Approved
        ? "ATTENDANCE_VERIFIED"
        : "ATTENDANCE_REJECTED";

    await db.securityLog.create({
      data: {
        id: randomUUID(),
        userId: user.userId,
        eventType,
        ipAddress: "::1",
        userAgent: "Server Action",
        success: true,
        metadata: {
          attendanceId: attendance.id,
          studentId: attendance.User_Attendance_userIdToUser.id,
          studentName: `${attendance.User_Attendance_userIdToUser.firstName} ${attendance.User_Attendance_userIdToUser.lastName}`,
          eventId: attendance.Event.id,
          eventName: attendance.Event.name,
          decision: validatedData.status,
          hasDisputeNotes: !!validatedData.disputeNotes,
        },
      },
    });

    // Invalidate attendance cache to refresh dashboard stats
    invalidateAttendanceCache();

    return {
      success: true,
      message: `Attendance ${validatedData.status.toLowerCase()} successfully`,
      data: updatedAttendance,
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
      error: "Failed to verify attendance",
    };
  }
}
