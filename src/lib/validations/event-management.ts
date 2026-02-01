/**
 * Zod validation schemas for Event Management features
 * Phase 3.2 - T010
 */

import { z } from "zod";
import { EventStatus } from "@prisma/client";

/**
 * Event list query parameters (FR-027, FR-028)
 * Used by: GET /api/moderator/events
 */
export const eventListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(10).max(100).default(20),
  status: z.nativeEnum(EventStatus).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().min(1).optional(),
  scope: z.enum(["mine", "all"]).default("all"),
  sortBy: z
    .enum(["name", "startDateTime", "endDateTime", "status", "createdAt"])
    .default("startDateTime"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type EventListQuery = z.infer<typeof eventListQuerySchema>;

/**
 * Event creation request (FR-016, FR-015)
 * Used by: POST /api/events
 * Inherits from Phase 2 event creation, extends with management features
 */
export const eventCreateSchema = z
  .object({
    name: z
      .string()
      .min(1, "Event name is required")
      .max(100, "Event name must not exceed 100 characters"),
    description: z
      .string()
      .max(
        3000,
        "Description must not exceed 3000 characters (approximately 300 words)",
      )
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          const wordCount = val.trim().split(/\s+/).length;
          return wordCount <= 300;
        },
        { message: "Description must not exceed 300 words" },
      ),
    startDateTime: z
      .string()
      .min(1, "Start date and time is required")
      .refine(
        (val) => {
          // Accept both ISO 8601 and datetime-local formats
          const date = new Date(val);
          return !isNaN(date.getTime());
        },
        { message: "Invalid date format" },
      ),
    endDateTime: z
      .string()
      .min(1, "End date and time is required")
      .refine(
        (val) => {
          // Accept both ISO 8601 and datetime-local formats
          const date = new Date(val);
          return !isNaN(date.getTime());
        },
        { message: "Invalid date format" },
      ),
    venueName: z
      .string()
      .min(1, "Venue name is required")
      .max(50, "Venue name must not exceed 50 characters"),
    venueAddress: z
      .string()
      .max(80, "Venue address must not exceed 80 characters")
      .optional(),
    campus: z
      .enum([
        "MainCampus",
        "MalimonoCampus",
        "MainitCampus",
        "ClaverCampus",
        "DelCarmenCampus",
      ])
      .default("MainCampus"),
    venueLatitude: z
      .number()
      .min(-90)
      .max(90)
      .refine(
        (val) => {
          // Limit to 6 decimal places
          const decimals = val.toString().split(".")[1];
          return !decimals || decimals.length <= 6;
        },
        { message: "Latitude must have at most 6 decimal places" },
      ),
    venueLongitude: z
      .number()
      .min(-180)
      .max(180)
      .refine(
        (val) => {
          // Limit to 6 decimal places
          const decimals = val.toString().split(".")[1];
          return !decimals || decimals.length <= 6;
        },
        { message: "Longitude must have at most 6 decimal places" },
      ),
    checkInBufferMins: z.number().int().min(0).max(120).default(30),
    checkOutBufferMins: z.number().int().min(0).max(120).default(30),
  })
  .refine((data) => new Date(data.endDateTime) > new Date(data.startDateTime), {
    message: "End date must be after start date",
    path: ["endDateTime"],
  })
  .refine(
    (data) => {
      const checkInStart = new Date(
        new Date(data.startDateTime).getTime() -
          data.checkInBufferMins * 60 * 1000,
      );
      return checkInStart > new Date();
    },
    {
      message:
        "Event check-in start time (startDateTime - checkInBufferMins) must be in the future",
      path: ["startDateTime"],
    },
  );

export type EventCreate = z.infer<typeof eventCreateSchema>;

/**
 * Event update request (FR-017, FR-019)
 * Used by: PATCH /api/events/:eventId
 * All fields optional for partial updates
 */
export const eventUpdateSchema = z
  .object({
    name: z
      .string()
      .min(1, "Event name is required")
      .max(100, "Event name must not exceed 100 characters")
      .optional(),
    description: z
      .string()
      .max(3000, "Description must not exceed 3000 characters")
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          const wordCount = val.trim().split(/\s+/).length;
          return wordCount <= 300;
        },
        { message: "Description must not exceed 300 words" },
      ),
    startDateTime: z
      .string()
      .refine(
        (val) => {
          // Accept both ISO 8601 and datetime-local formats
          const date = new Date(val);
          return !isNaN(date.getTime());
        },
        { message: "Invalid date format" },
      )
      .optional(),
    endDateTime: z
      .string()
      .refine(
        (val) => {
          // Accept both ISO 8601 and datetime-local formats
          const date = new Date(val);
          return !isNaN(date.getTime());
        },
        { message: "Invalid date format" },
      )
      .optional(),
    venueName: z
      .string()
      .min(1, "Venue name is required")
      .max(50, "Venue name must not exceed 50 characters")
      .optional(),
    venueAddress: z
      .string()
      .max(80, "Venue address must not exceed 80 characters")
      .optional(),
    campus: z
      .enum([
        "MainCampus",
        "MalimonoCampus",
        "MainitCampus",
        "ClaverCampus",
        "DelCarmenCampus",
      ])
      .optional(),
    venueLatitude: z
      .number()
      .min(-90)
      .max(90)
      .refine(
        (val) => {
          // Limit to 6 decimal places
          const decimals = val.toString().split(".")[1];
          return !decimals || decimals.length <= 6;
        },
        { message: "Latitude must have at most 6 decimal places" },
      )
      .optional(),
    venueLongitude: z
      .number()
      .min(-180)
      .max(180)
      .refine(
        (val) => {
          // Limit to 6 decimal places
          const decimals = val.toString().split(".")[1];
          return !decimals || decimals.length <= 6;
        },
        { message: "Longitude must have at most 6 decimal places" },
      )
      .optional(),
    checkInBufferMins: z.number().int().min(0).max(120).optional(),
    checkOutBufferMins: z.number().int().min(0).max(120).optional(),
    status: z.nativeEnum(EventStatus).optional(),
  })
  .refine(
    (data) => {
      if (data.startDateTime && data.endDateTime) {
        return new Date(data.endDateTime) > new Date(data.startDateTime);
      }
      return true;
    },
    {
      message: "End date must be after start date",
      path: ["endDateTime"],
    },
  );

export type EventUpdate = z.infer<typeof eventUpdateSchema>;
