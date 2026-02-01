"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { randomUUID } from "crypto";
import { generateAttendanceCSV } from "@/lib/export/csv-generator";
import { generateAttendancePDFHTML } from "@/lib/export/pdf-generator";
import { saveExportFileLocally } from "@/lib/local-download";

/**
 * Attendance export with comprehensive filtering
 * Supports department, course, campus, and check-in/check-out type filtering
 */

const exportFiltersSchema = z.object({
  eventId: z.string().min(1, "Event is required"),
  department: z.string().optional(),
  course: z.string().optional(),
  campus: z.string().optional(),
  exportType: z.enum(["checkIn", "checkOut"]),
  exportFormat: z.enum(["csv", "pdf"]).default("csv"),
});

type ExportFilters = z.infer<typeof exportFiltersSchema>;

/**
 * Reduced export limit to prevent memory exhaustion on large events
 * For events with 5000+ records, recommend splitting by department/course
 */
const MAX_EXPORT_RECORDS = 5000;
const CHUNK_SIZE = 500; // Process records in chunks to limit memory use

export async function exportAttendance(filters: ExportFilters) {
  try {
    const user = await requireRole(["Administrator", "Moderator"]);

    // Validate filters
    const validatedFilters = exportFiltersSchema.parse(filters);

    // Build where clause
    const where: Prisma.AttendanceWhereInput = {
      eventId: validatedFilters.eventId,
    };

    // Moderator scope: only export attendances for events they created
    if (user.role === "Moderator") {
      where.Event = {
        createdById: user.userId,
      };
    }

    // Build user profile filters
    const userProfileFilters: Prisma.UserProfileWhereInput = {};
    let hasProfileFilters = false;

    // Department filter
    if (validatedFilters.department && validatedFilters.department !== "all") {
      userProfileFilters.department = validatedFilters.department as
        | "CCIS"
        | "COE"
        | "CAS"
        | "CAAS"
        | "CTE"
        | "COT";
      hasProfileFilters = true;
    }

    // Course filter
    if (validatedFilters.course && validatedFilters.course !== "all") {
      userProfileFilters.course = {
        contains: validatedFilters.course,
        mode: "insensitive",
      };
      hasProfileFilters = true;
    }

    // Campus filter
    if (validatedFilters.campus) {
      const campusMap: Record<string, string> = {
        "Main Campus": "MainCampus",
        "Malimono Campus": "MalimonoCampus",
        "Mainit Campus": "MainitCampus",
        "Claver Campus": "ClaverCampus",
        "Del Carmen Campus": "DelCarmenCampus",
      };
      userProfileFilters.campus = campusMap[validatedFilters.campus] as
        | "MainCampus"
        | "MalimonoCampus"
        | "MainitCampus"
        | "ClaverCampus"
        | "DelCarmenCampus";
      hasProfileFilters = true;
    }

    // Apply profile filters if any exist
    if (hasProfileFilters) {
      where.User_Attendance_userIdToUser = {
        UserProfile: userProfileFilters,
      };
    }

    // Count total records
    const total = await db.attendance.count({ where });

    if (total === 0) {
      return {
        success: false,
        error: "No attendance records found matching the filters",
      };
    }

    if (total > MAX_EXPORT_RECORDS) {
      return {
        success: false,
        error: `Export limit exceeded (${total} records). Maximum ${MAX_EXPORT_RECORDS} records allowed. Try filtering by department or course to reduce the dataset.`,
      };
    }

    // Fetch attendances with minimal relations (only required fields for export)
    // Use cursor-based pagination with chunks to avoid loading entire dataset into memory
    type AttendanceExportRecord = Awaited<
      ReturnType<typeof db.attendance.findMany>
    >;
    let allAttendances: AttendanceExportRecord = [];

    for (let skip = 0; skip < total; skip += CHUNK_SIZE) {
      const chunk = await db.attendance.findMany({
        where,
        include: {
          User_Attendance_userIdToUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              UserProfile: {
                select: {
                  studentId: true,
                  department: true,
                  yearLevel: true,
                  section: true,
                  course: true,
                  campus: true,
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
            },
          },
        },
        orderBy: {
          checkInSubmittedAt: "asc",
        },
        skip,
        take: CHUNK_SIZE,
      });

      allAttendances = allAttendances.concat(chunk);
    }

    const attendances = allAttendances as unknown as Parameters<
      typeof generateAttendanceCSV
    >[0];

    // Get event details for header
    const event = await db.event.findUnique({
      where: { id: validatedFilters.eventId },
      select: {
        name: true,
        startDateTime: true,
        endDateTime: true,
        checkInBufferMins: true,
        checkOutBufferMins: true,
      },
    });

    if (!event) {
      return {
        success: false,
        error: "Event not found",
      };
    }

    const courseLabel = validatedFilters.course || "All Courses/Programs";

    const exportFormat = validatedFilters.exportFormat;

    // Generate payloads per format
    const csvPayload = async () => {
      const csvContent = generateAttendanceCSV(
        attendances as Parameters<typeof generateAttendanceCSV>[0],
      );

      const buffer = Buffer.from(csvContent, "utf-8");
      const filename = `attendance-export-${courseLabel
        .replace(/[^a-z0-9]/gi, "-")
        .toLowerCase()}-${Date.now()}.csv`;

      try {
        await saveExportFileLocally({
          format: "csv",
          filename,
          content: buffer,
        });
      } catch (error) {
        console.warn("Local CSV export save failed:", error);
      }

      return {
        fileData: buffer.toString("base64"),
        filename,
        fileSize: buffer.length,
        recordCount: attendances.length,
        format: "CSV" as const,
      };
    };

    const pdfPayload = async () => {
      const html = generateAttendancePDFHTML(
        attendances as unknown as Parameters<
          typeof generateAttendancePDFHTML
        >[0],
        courseLabel,
        validatedFilters.exportType === "checkIn",
      );

      const filename = `attendance-export-${courseLabel
        .replace(/[^a-z0-9]/gi, "-")
        .toLowerCase()}-${Date.now()}.html`;

      try {
        await saveExportFileLocally({
          format: "pdf",
          filename,
          content: html,
        });
      } catch (error) {
        console.warn("Local PDF export save failed:", error);
      }

      return {
        html,
        filename,
        fileSize: Buffer.byteLength(html, "utf-8"),
        recordCount: attendances.length,
        format: "PDF" as const,
      };
    };

    const payload =
      exportFormat === "pdf" ? await pdfPayload() : await csvPayload();

    // Create export record
    const exportRecord = await db.exportRecord.create({
      data: {
        id: randomUUID(),
        exportedById: user.userId,
        format: payload.format,
        filters: {
          eventId: validatedFilters.eventId,
          department: validatedFilters.department,
          course: validatedFilters.course,
          campus: validatedFilters.campus,
          exportType: validatedFilters.exportType,
          exportFormat: validatedFilters.exportFormat,
        },
        recordCount: attendances.length,
        status: "COMPLETED",
        fileSize: payload.fileSize,
        downloadUrl: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Log to security log
    await db.securityLog.create({
      data: {
        id: randomUUID(),
        userId: user.userId,
        eventType: "DATA_EXPORTED",
        success: true,
        ipAddress: "server",
        userAgent: "server-action",
        metadata: {
          exportRecordId: exportRecord.id,
          eventId: validatedFilters.eventId,
          course: validatedFilters.course,
          department: validatedFilters.department,
          campus: validatedFilters.campus,
          exportType: validatedFilters.exportType,
          exportFormat: validatedFilters.exportFormat,
          recordCount: attendances.length,
        },
      },
    });

    return {
      success: true,
      data: {
        ...payload,
        expiresAt: exportRecord.expiresAt,
      },
    };
  } catch (error) {
    console.error("Export attendance error:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues.map((e) => e.message).join(", "),
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
      error: "Failed to export attendance data",
    };
  }
}
