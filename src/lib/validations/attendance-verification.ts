/**
 * Zod validation schemas for Attendance Verification features
 * Phase 3.2 - T011
 */

import { z } from "zod";
import { VerificationStatus } from "@prisma/client";

/**
 * Attendance verification request (FR-033, FR-034, FR-035)
 * Used by: PATCH /api/moderator/attendance/:attendanceId/verify
 */
export const attendanceVerifySchema = z
  .object({
    status: z.enum([VerificationStatus.Approved, VerificationStatus.Rejected]),
    disputeNotes: z.string().max(1000).optional(),
    resolutionNotes: z.string().max(1000).optional(),
  })
  .refine(
    (data) => {
      // If status is REJECTED, disputeNotes is required
      if (data.status === VerificationStatus.Rejected) {
        return !!data.disputeNotes && data.disputeNotes.trim().length > 0;
      }
      return true;
    },
    {
      message: "Dispute notes are required when rejecting attendance",
      path: ["disputeNotes"],
    },
  );

export type AttendanceVerify = z.infer<typeof attendanceVerifySchema>;

/**
 * Attendance appeal request (FR-033.1, FR-040)
 * Used by: POST /api/attendance/:attendanceId/appeal
 */
export const attendanceAppealSchema = z.object({
  appealMessage: z.string().min(10).max(1000),
});

export type AttendanceAppeal = z.infer<typeof attendanceAppealSchema>;

/**
 * Attendance list query parameters (FR-029, FR-030)
 * Used by: GET /api/moderator/attendance
 */
export const attendanceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(10).max(100).default(20),
  eventId: z.string().cuid().optional(),
  status: z.nativeEnum(VerificationStatus).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  department: z.string().min(1).optional(),
  course: z.string().min(1).optional(),
  search: z.string().min(1).optional(),
  myEventsOnly: z
    .union([z.boolean(), z.string(), z.undefined()])
    .transform((val) => val === true || val === "true")
    .optional(),
  sortBy: z
    .enum([
      "checkInSubmittedAt",
      "verifiedAt",
      "verificationStatus",
      "createdAt",
    ])
    .default("checkInSubmittedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type AttendanceListQuery = z.infer<typeof attendanceListQuerySchema>;

export const attendanceUserListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(10).max(100).default(10),
  status: z.nativeEnum(VerificationStatus).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().min(1).optional(),
  sortBy: z
    .enum([
      "checkInSubmittedAt",
      "verifiedAt",
      "verificationStatus",
      "eventName",
      "createdAt",
    ])
    .default("checkInSubmittedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type AttendanceUserListQuery = z.infer<
  typeof attendanceUserListQuerySchema
>;

/**
 * Dispute resolution request (FR-041)
 * Used by: PATCH /api/moderator/attendance/:attendanceId/resolve
 */
export const disputeResolutionSchema = z.object({
  status: z.enum([VerificationStatus.Approved, VerificationStatus.Rejected]),
  resolutionNotes: z.string().min(10).max(1000),
});

export type DisputeResolution = z.infer<typeof disputeResolutionSchema>;
