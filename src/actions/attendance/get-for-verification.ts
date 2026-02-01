"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";

export type AttendanceForVerification = {
  id: string;
  studentName: string;
  studentNumber: string;
  studentEmail: string;
  department: string;
  yearLevel: number | null;
  section: string | null;
  eventName: string;
  eventVenue: string;
  eventStartDate: string;
  eventEndDate: string;
  checkInSubmittedAt: string | null;
  checkInLatitude: number | null;
  checkInLongitude: number | null;
  checkInDistance: number | null;
  checkInFrontPhoto: string | null;
  checkInBackPhoto: string | null;
  checkInSignature: string | null;
  checkOutSubmittedAt: string | null;
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
  checkOutDistance: number | null;
  checkOutFrontPhoto: string | null;
  checkOutBackPhoto: string | null;
  checkOutSignature: string | null;
  verificationStatus: "Pending" | "Approved" | "Rejected";
  verifiedByName: string | null;
  verifiedAt: string | null;
  disputeNote: string | null;
};

type ErrorCode = "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "UNKNOWN";

export async function getAttendanceForVerification(
  attendanceId: string,
): Promise<
  | { success: true; data: AttendanceForVerification }
  | { success: false; error: ErrorCode }
> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "UNAUTHENTICATED" };
    }

    if (user.role !== "Moderator" && user.role !== "Administrator") {
      return { success: false, error: "FORBIDDEN" };
    }

    const attendance = await db.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        User_Attendance_userIdToUser: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
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
        Event: {
          select: {
            name: true,
            venueName: true,
            startDateTime: true,
            endDateTime: true,
            createdById: true,
          },
        },
        User_Attendance_verifiedByIdToUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!attendance) {
      return { success: false, error: "NOT_FOUND" };
    }

    if (
      user.role === "Moderator" &&
      attendance.Event.createdById !== user.userId
    ) {
      return { success: false, error: "FORBIDDEN" };
    }

    return {
      success: true,
      data: {
        id: attendance.id,
        studentName: `${attendance.User_Attendance_userIdToUser.firstName} ${attendance.User_Attendance_userIdToUser.lastName}`,
        studentNumber:
          attendance.User_Attendance_userIdToUser.UserProfile?.studentId ||
          "N/A",
        studentEmail: attendance.User_Attendance_userIdToUser.email,
        department:
          attendance.User_Attendance_userIdToUser.UserProfile?.department ||
          "N/A",
        yearLevel:
          attendance.User_Attendance_userIdToUser.UserProfile?.yearLevel ??
          null,
        section:
          attendance.User_Attendance_userIdToUser.UserProfile?.section ?? null,
        eventName: attendance.Event.name,
        eventVenue: attendance.Event.venueName,
        eventStartDate: attendance.Event.startDateTime.toISOString(),
        eventEndDate: attendance.Event.endDateTime.toISOString(),
        checkInSubmittedAt: attendance.checkInSubmittedAt
          ? attendance.checkInSubmittedAt.toISOString()
          : null,
        checkInLatitude: attendance.checkInLatitude,
        checkInLongitude: attendance.checkInLongitude,
        checkInDistance: attendance.checkInDistance,
        checkInFrontPhoto: attendance.checkInFrontPhoto,
        checkInBackPhoto: attendance.checkInBackPhoto,
        checkInSignature: attendance.checkInSignature,
        checkOutSubmittedAt: attendance.checkOutSubmittedAt
          ? attendance.checkOutSubmittedAt.toISOString()
          : null,
        checkOutLatitude: attendance.checkOutLatitude,
        checkOutLongitude: attendance.checkOutLongitude,
        checkOutDistance: attendance.checkOutDistance,
        checkOutFrontPhoto: attendance.checkOutFrontPhoto,
        checkOutBackPhoto: attendance.checkOutBackPhoto,
        checkOutSignature: attendance.checkOutSignature,
        verificationStatus:
          attendance.verificationStatus as AttendanceForVerification["verificationStatus"],
        verifiedByName: attendance.User_Attendance_verifiedByIdToUser
          ? `${attendance.User_Attendance_verifiedByIdToUser.firstName} ${attendance.User_Attendance_verifiedByIdToUser.lastName}`
          : null,
        verifiedAt: attendance.verifiedAt
          ? attendance.verifiedAt.toISOString()
          : null,
        disputeNote: attendance.disputeNote,
      },
    };
  } catch (error) {
    console.error("getAttendanceForVerification error", error);
    return { success: false, error: "UNKNOWN" };
  }
}
