"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/server";
import { attendanceVerifySchema } from "@/lib/validations/attendance-verification";
import { ZodError } from "zod";
import { headers } from "next/headers";
import { randomUUID } from "crypto";

/**
 * Verify (approve/reject) student attendance submission
 * @param attendanceId - Attendance record ID
 * @param input - Verification data
 * @returns Updated attendance record
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function verifyAttendance(attendanceId: string, input: any) {
  try {
    // Require Moderator or Administrator role
    const user = await requireRole(["Moderator", "Administrator"]);

    // Validate input
    const validatedData = attendanceVerifySchema.parse(input);

    // Get attendance record
    const attendance = await db.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        User_Attendance_userIdToUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        Event: {
          select: {
            name: true,
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

    // Can only verify Pending attendance
    if (attendance.verificationStatus !== "Pending") {
      return {
        success: false,
        error: "Attendance already verified",
        currentStatus: attendance.verificationStatus,
        verifiedBy: attendance.verifiedById,
        verifiedAt: attendance.verifiedAt,
      };
    }

    // Update attendance
    const updatedAttendance = await db.attendance.update({
      where: { id: attendanceId },
      data: {
        verificationStatus: validatedData.status,
        verifiedById: user.userId,
        verifiedAt: new Date(),
        disputeNote: validatedData.disputeNotes || null,
        resolutionNotes: validatedData.resolutionNotes || null,
      },
      include: {
        User_Attendance_userIdToUser: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        Event: {
          select: {
            name: true,
          },
        },
      },
    });

    // Log to SecurityLog
    const headersList = await headers();
    const ipAddress =
      headersList.get("x-forwarded-for") ||
      headersList.get("x-real-ip") ||
      undefined;
    const userAgent = headersList.get("user-agent") || undefined;

    await db.securityLog.create({
      data: {
        id: randomUUID(),
        userId: user.userId,
        eventType: "ATTENDANCE_VERIFIED",
        metadata: {
          attendanceId,
          previousStatus: attendance.verificationStatus,
          newStatus: validatedData.status,
          studentId: attendance.userId,
          eventName: attendance.Event.name,
          disputeNote: validatedData.disputeNotes || null,
          resolutionNotes: validatedData.resolutionNotes || null,
        },
        ipAddress,
        userAgent,
      },
    });

    return {
      success: true,
      data: updatedAttendance,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: "Validation failed",
        details: error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
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
