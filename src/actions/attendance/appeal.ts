"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/server";
import { attendanceAppealSchema } from "@/lib/validations/attendance-verification";
import { VerificationStatus } from "@prisma/client";
import { z } from "zod";
import { randomUUID } from "crypto";

/**
 * T026: Student attendance appeal
 * Phase 3.5 - Server Actions - Attendance Verification
 * Allow students to appeal rejected attendance verifications
 * Transitions status from Rejected back to Pending for moderator review
 */
export async function appealAttendance(
  attendanceId: string,
  input: { appealMessage: string },
) {
  try {
    // Require Student role
    const user = await requireRole(["Student"]);

    // Validate input
    const validatedData = attendanceAppealSchema.parse(input);

    // Validate attendanceId
    const attendanceIdSchema = z.string().cuid("Invalid attendance ID");
    attendanceIdSchema.parse(attendanceId);

    // Fetch the attendance record
    const attendance = await db.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        Event: { select: { id: true, name: true } },
      },
    });

    if (!attendance) {
      return {
        success: false,
        error: "Attendance record not found",
      };
    }

    // Verify ownership
    if (attendance.userId !== user.userId) {
      return {
        success: false,
        error: "You can only appeal your own attendance records",
      };
    }

    // Verify status is Rejected
    if (attendance.verificationStatus !== VerificationStatus.Rejected) {
      return {
        success: false,
        error: "Only rejected attendance can be appealed",
        details: `Current status is ${attendance.verificationStatus}. Only Rejected attendances can be appealed.`,
      };
    }

    // Update status back to Pending for review
    const updatedAttendance = await db.attendance.update({
      where: { id: attendanceId },
      data: {
        verificationStatus: VerificationStatus.Pending,
        appealMessage: validatedData.appealMessage,
      },
    });

    // Log security event (FR-013)
    await db.securityLog.create({
      data: {
        id: randomUUID(),
        userId: user.userId,
        eventType: "ATTENDANCE_APPEALED",
        ipAddress: "::1",
        userAgent: "Server Action",
        success: true,
        metadata: {
          attendanceId: attendance.id,
          studentId: user.userId,
          eventId: attendance.Event.id,
          eventName: attendance.Event.name,
          appealMessageLength: validatedData.appealMessage.length,
        },
      },
    });

    return {
      success: true,
      data: updatedAttendance,
      message:
        "Appeal submitted successfully. A moderator will review your request.",
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
      error: "Failed to submit appeal",
    };
  }
}
