/**
 * Zod validation schemas for Data Export features (FR-043 to FR-052)
 * Phase 3.2 - T012
 */

import { z } from "zod";
import { VerificationStatus } from "@prisma/client";

/**
 * Export filters request (FR-048)
 * Used by CSV attendance export endpoints
 */
export const exportFiltersSchema = z
  .object({
    eventIds: z
      .array(z.string().cuid())
      .min(1)
      .max(50, "Maximum 50 event IDs allowed")
      .optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    status: z.nativeEnum(VerificationStatus).optional(),
    studentName: z.string().min(2).max(200).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    },
  );

export type ExportFilters = z.infer<typeof exportFiltersSchema>;

/**
 * Server-side validation for export record count
 * Not a Zod schema - used in server action after querying database
 */
export const MAX_EXPORT_RECORDS = 10_000;

/**
 * Validate export record count before generation
 * @param recordCount - Number of records matching export filters
 * @throws Error if recordCount exceeds MAX_EXPORT_RECORDS
 */
export function validateExportRecordCount(recordCount: number): void {
  if (recordCount > MAX_EXPORT_RECORDS) {
    throw new Error(
      `Export exceeds maximum record limit (${MAX_EXPORT_RECORDS.toLocaleString()} records). Please refine your filters. Current match: ${recordCount.toLocaleString()} records.`,
    );
  }
}
