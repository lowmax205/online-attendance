"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/server";
import { submitAttendanceSchema } from "@/lib/validations/attendance";
import { calculateDistance } from "@/lib/geolocation";
import { uploadPhoto, uploadSignature } from "@/lib/cloudinary";
import { saveAttendanceMediaLocally } from "@/lib/local-download";
import { invalidateAttendanceCache } from "@/lib/cache";
import { ZodError } from "zod";
import { headers } from "next/headers";
import { randomUUID } from "crypto";

/**
 * Determine verification status based on distance from venue
 * @param distance - Distance in meters from the event venue
 * @returns Verification status (Approved/Pending/Rejected)
 */
function getVerificationStatusByDistance(
  distance: number,
): "Approved" | "Pending" | "Rejected" {
  if (distance <= 20) {
    return "Approved"; // Within 20m: Auto-approve
  } else if (distance <= 90) {
    return "Pending"; // 20-90m: Needs manual review
  } else {
    return "Rejected"; // Over 90m: Auto-reject
  }
}

/**
 * Submit attendance record with location verification and image uploads
 * Handles both check-in and check-out submissions
 * @param input - Attendance submission data (including attendanceType)
 * @returns Created or updated attendance record
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function submitAttendance(input: any) {
  try {
    // Require Student role (or higher)
    const user = await requireRole(["Student", "Moderator", "Administrator"]);

    // Validate input
    const validatedData = submitAttendanceSchema.parse(input);

    // Check if user's profile is complete
    const userProfile = await db.userProfile.findUnique({
      where: { userId: user.userId },
    });

    const userInfo = await db.user.findUnique({
      where: { id: user.userId },
      select: { firstName: true, lastName: true },
    });

    if (!userProfile) {
      return {
        success: false,
        error:
          "Profile incomplete: Please complete your profile before checking in",
      };
    }

    // Get event details
    const event = await db.event.findUnique({
      where: { id: validatedData.eventId },
      select: {
        id: true,
        name: true,
        startDateTime: true,
        endDateTime: true,
        venueLatitude: true,
        venueLongitude: true,
        checkInBufferMins: true,
        checkOutBufferMins: true,
        status: true,
      },
    });

    if (!event) {
      return {
        success: false,
        error: "Event not found",
      };
    }

    // Check if event is Active
    if (event.status !== "Active") {
      return {
        success: false,
        error: `Event is ${event.status}`,
      };
    }

    // Calculate attendance windows
    const checkInOpens = event.startDateTime;
    const checkInCloses = new Date(
      event.startDateTime.getTime() + event.checkInBufferMins * 60 * 1000,
    );
    const checkOutOpens = new Date(
      event.endDateTime.getTime() - event.checkOutBufferMins * 60 * 1000,
    );
    const checkOutCloses = event.endDateTime;
    const now = new Date();

    // Validate window based on attendance type
    if (validatedData.attendanceType === "check-in") {
      if (now < checkInOpens) {
        return {
          success: false,
          error: "Check-in window not open",
          message: `Check-in opens at ${checkInOpens.toISOString()}`,
        };
      }
      if (now > checkInCloses) {
        return {
          success: false,
          error: "Check-in window closed",
          message: `Check-in closed at ${checkInCloses.toISOString()}`,
        };
      }
    } else {
      // check-out
      if (now < checkOutOpens) {
        return {
          success: false,
          error: "Check-out window not open",
          message: `Check-out opens at ${checkOutOpens.toISOString()}`,
        };
      }
      if (now > checkOutCloses) {
        return {
          success: false,
          error: "Check-out window closed",
          message: `Check-out closed at ${checkOutCloses.toISOString()}`,
        };
      }
    }

    // Calculate distance from venue
    const distance = calculateDistance(
      validatedData.latitude,
      validatedData.longitude,
      event.venueLatitude,
      event.venueLongitude,
    );

    // Verify location within 100m (hard limit for submission)
    if (distance > 100) {
      return {
        success: false,
        error: "Validation failed",
        details: [
          {
            field: "distanceFromVenue",
            message: `Location verification failed: Not within 100m of venue (distance: ${distance.toFixed(1)}m)`,
          },
        ],
      };
    }

    // Determine verification status based on distance
    // 0-20m: Auto-approved | 20-90m: Pending review | 90-100m: Auto-rejected
    const verificationStatus = getVerificationStatusByDistance(distance);
    const statusChangeReason =
      distance <= 20
        ? `Auto-approved: Within 20m of venue (${distance.toFixed(1)}m)`
        : distance <= 90
          ? `Pending review: ${distance.toFixed(1)}m from venue (20-90m range)`
          : `Auto-rejected: ${distance.toFixed(1)}m from venue (exceeds 90m threshold)`;

    // Check for existing attendance record
    const existingAttendance = await db.attendance.findUnique({
      where: {
        eventId_userId: {
          eventId: validatedData.eventId,
          userId: user.userId,
        },
      },
    });

    // Prevent re-submission of media once recorded
    const checkInAlreadySubmitted = Boolean(
      existingAttendance?.checkInSubmittedAt,
    );
    const checkOutAlreadySubmitted = Boolean(
      existingAttendance?.checkOutSubmittedAt,
    );

    if (
      validatedData.attendanceType === "check-in" &&
      checkInAlreadySubmitted
    ) {
      return {
        success: false,
        error: "Duplicate submission",
        message: "Check-in has already been recorded for this event.",
      };
    }

    if (
      validatedData.attendanceType === "check-out" &&
      checkOutAlreadySubmitted
    ) {
      return {
        success: false,
        error: "Duplicate submission",
        message: "Check-out has already been recorded for this event.",
      };
    }

    // Upload images to Cloudinary with user-scoped naming
    const cloudinaryFolder = `attendance/${event.id}/${user.userId}`;
    const timestamp = Date.now();
    const recordId = existingAttendance?.id || "new";
    const baseName = `${validatedData.attendanceType}_${user.userId}_${timestamp}_${recordId}`;

    try {
      await saveAttendanceMediaLocally({
        attendanceType: validatedData.attendanceType,
        submittedAt: now,
        frontPhotoBase64: validatedData.frontPhotoBase64,
        backPhotoBase64: validatedData.backPhotoBase64,
        signatureBase64: validatedData.signatureBase64,
        firstName: userInfo?.firstName,
        lastName: userInfo?.lastName,
        identifier: userProfile.studentId || user.userId,
      });
    } catch (error) {
      console.warn("Local attendance media save failed:", error);
    }

    const [frontPhotoUrl, backPhotoUrl, signatureUrl] = await Promise.all([
      uploadPhoto(
        validatedData.frontPhotoBase64,
        cloudinaryFolder,
        `${baseName}_front`,
      ),
      uploadPhoto(
        validatedData.backPhotoBase64,
        cloudinaryFolder,
        `${baseName}_back`,
      ),
      uploadSignature(
        validatedData.signatureBase64,
        cloudinaryFolder,
        `${baseName}_signature`,
      ),
    ]);

    // Get IP and User Agent
    const headersList = await headers();
    const ipAddress =
      headersList.get("x-forwarded-for") ||
      headersList.get("x-real-ip") ||
      undefined;
    const userAgent = headersList.get("user-agent") || undefined;

    let updatedAttendance;

    if (validatedData.attendanceType === "check-in") {
      // Check-in: Create new record or update if exists (shouldn't happen)
      if (existingAttendance) {
        // Populate initial check-in data for pre-created attendance slots
        updatedAttendance = await db.attendance.update({
          where: { id: existingAttendance.id },
          data: {
            checkInSubmittedAt: now,
            checkInLatitude: validatedData.latitude,
            checkInLongitude: validatedData.longitude,
            checkInDistance: distance,
            checkInFrontPhoto: frontPhotoUrl,
            checkInBackPhoto: backPhotoUrl,
            checkInSignature: signatureUrl,
            checkInIpAddress: ipAddress,
            checkInUserAgent: userAgent,
            verificationStatus,
            ...(verificationStatus === "Approved" && {
              verifiedAt: now,
              verifiedById: null, // Auto-verified without a human reviewer
            }),
          },
          include: {
            Event: {
              select: {
                name: true,
                startDateTime: true,
                endDateTime: true,
              },
            },
          },
        });
      } else {
        // Create new attendance record
        updatedAttendance = await db.attendance.create({
          data: {
            id: randomUUID(),
            eventId: validatedData.eventId,
            userId: user.userId,
            checkInSubmittedAt: now,
            checkInLatitude: validatedData.latitude,
            checkInLongitude: validatedData.longitude,
            checkInDistance: distance,
            checkInFrontPhoto: frontPhotoUrl,
            checkInBackPhoto: backPhotoUrl,
            checkInSignature: signatureUrl,
            checkInIpAddress: ipAddress,
            checkInUserAgent: userAgent,
            verificationStatus,
            ...(verificationStatus === "Approved" && {
              verifiedAt: now,
              verifiedById: null, // Auto-verified without a human reviewer
            }),
          },
          include: {
            Event: {
              select: {
                name: true,
                startDateTime: true,
                endDateTime: true,
              },
            },
          },
        });
      }

      // Log check-in
      await db.securityLog.create({
        data: {
          id: randomUUID(),
          userId: user.userId,
          eventType: "REGISTRATION",
          metadata: {
            attendanceId: updatedAttendance.id,
            eventId: event.id,
            eventName: event.name,
            distanceFromVenue: distance,
            verificationStatus,
            autoVerified: verificationStatus !== "Pending",
            statusReason: statusChangeReason,
          },
          ipAddress,
          userAgent,
        },
      });
    } else {
      // Check-out: Must have existing record with check-in
      if (!existingAttendance) {
        return {
          success: false,
          error: "Check-in required",
          message: "You must check in before you can check out",
        };
      }

      if (!existingAttendance.checkInSubmittedAt) {
        return {
          success: false,
          error: "Check-in required",
          message: "You must check in before you can check out",
        };
      }

      // Update with check-out data (single allowed submission)
      updatedAttendance = await db.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          checkOutSubmittedAt: now,
          checkOutLatitude: validatedData.latitude,
          checkOutLongitude: validatedData.longitude,
          checkOutDistance: distance,
          checkOutFrontPhoto: frontPhotoUrl,
          checkOutBackPhoto: backPhotoUrl,
          checkOutSignature: signatureUrl,
          checkOutIpAddress: ipAddress,
          checkOutUserAgent: userAgent,
        },
        include: {
          Event: {
            select: {
              name: true,
              startDateTime: true,
              endDateTime: true,
            },
          },
        },
      });

      // Log check-out
      await db.securityLog.create({
        data: {
          id: randomUUID(),
          userId: user.userId,
          eventType: "REGISTRATION",
          metadata: {
            attendanceId: updatedAttendance.id,
            eventId: event.id,
            eventName: event.name,
            distanceFromVenue: distance,
          },
          ipAddress,
          userAgent,
        },
      });
    }

    // Invalidate attendance cache to refresh dashboard stats
    invalidateAttendanceCache();

    return {
      success: true,
      data: updatedAttendance,
      attendanceType: validatedData.attendanceType,
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
      error: "Failed to submit attendance",
    };
  }
}
