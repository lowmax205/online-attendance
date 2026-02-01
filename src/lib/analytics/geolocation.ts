/**
 * Geolocation Analytics Functions
 * Provides geolocation data for attendance visualization
 */

import { db } from "@/lib/db";
import { calculateDistance } from "@/lib/geolocation";
import { VerificationStatus } from "@prisma/client";

export interface AttendanceGeolocation {
  id: string;
  userId: string;
  userName: string;
  eventId: string;
  eventName: string;
  eventLat: number;
  eventLon: number;
  checkInLat: number | null;
  checkInLon: number | null;
  checkOutLat: number | null;
  checkOutLon: number | null;
  checkInDistance: number | null;
  checkOutDistance: number | null;
  verificationStatus: VerificationStatus;
  checkInSubmittedAt: Date | null;
  checkOutSubmittedAt: Date | null;
}

/**
 * Get attendance geolocation data for map visualization
 * Returns attendances with GPS coordinates and their distance from event venue
 */
export async function getAttendanceGeolocations(
  startDate: Date,
  endDate: Date,
) {
  const attendances = await db.attendance.findMany({
    where: {
      AND: [
        {
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
        {
          // Only include attendances with at least one GPS coordinate
          OR: [
            {
              AND: [
                { checkInLatitude: { not: null } },
                { checkInLongitude: { not: null } },
              ],
            },
            {
              AND: [
                { checkOutLatitude: { not: null } },
                { checkOutLongitude: { not: null } },
              ],
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      userId: true,
      eventId: true,
      checkInLatitude: true,
      checkInLongitude: true,
      checkOutLatitude: true,
      checkOutLongitude: true,
      checkInDistance: true,
      checkOutDistance: true,
      verificationStatus: true,
      checkInSubmittedAt: true,
      checkOutSubmittedAt: true,
      User_Attendance_userIdToUser: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      Event: {
        select: {
          id: true,
          name: true,
          venueLatitude: true,
          venueLongitude: true,
        },
      },
    },
    orderBy: {
      checkInSubmittedAt: "desc",
    },
  });

  // Transform to geolocation format
  const geolocations: AttendanceGeolocation[] = attendances.map(
    (attendance) => {
      const userName = `${attendance.User_Attendance_userIdToUser.firstName} ${attendance.User_Attendance_userIdToUser.lastName}`;

      // Calculate distances if not stored
      let checkInDistance = attendance.checkInDistance;
      let checkOutDistance = attendance.checkOutDistance;

      if (
        attendance.checkInLatitude &&
        attendance.checkInLongitude &&
        attendance.Event.venueLatitude &&
        attendance.Event.venueLongitude &&
        !checkInDistance
      ) {
        checkInDistance = calculateDistance(
          attendance.checkInLatitude,
          attendance.checkInLongitude,
          attendance.Event.venueLatitude,
          attendance.Event.venueLongitude,
        );
      }

      if (
        attendance.checkOutLatitude &&
        attendance.checkOutLongitude &&
        attendance.Event.venueLatitude &&
        attendance.Event.venueLongitude &&
        !checkOutDistance
      ) {
        checkOutDistance = calculateDistance(
          attendance.checkOutLatitude,
          attendance.checkOutLongitude,
          attendance.Event.venueLatitude,
          attendance.Event.venueLongitude,
        );
      }

      return {
        id: attendance.id,
        userId: attendance.userId,
        userName,
        eventId: attendance.eventId,
        eventName: attendance.Event.name,
        eventLat: attendance.Event.venueLatitude || 0,
        eventLon: attendance.Event.venueLongitude || 0,
        checkInLat: attendance.checkInLatitude,
        checkInLon: attendance.checkInLongitude,
        checkOutLat: attendance.checkOutLatitude,
        checkOutLon: attendance.checkOutLongitude,
        checkInDistance,
        checkOutDistance,
        verificationStatus: attendance.verificationStatus,
        checkInSubmittedAt: attendance.checkInSubmittedAt,
        checkOutSubmittedAt: attendance.checkOutSubmittedAt,
      };
    },
  );

  return geolocations;
}
