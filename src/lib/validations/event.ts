import { z } from "zod";

/**
 * Zod schema for event creation
 * Based on event-create.json contract
 */
export const createEventSchema = z
  .object({
    name: z
      .string()
      .min(3, "Event name must be at least 3 characters")
      .max(200, "Event name must not exceed 200 characters"),
    description: z
      .string()
      .max(2000, "Description must not exceed 2000 characters")
      .optional(),
    startDateTime: z.coerce.date({
      message: "Start date and time is required",
    }),
    endDateTime: z.coerce.date({
      message: "End date and time is required",
    }),
    venueLatitude: z
      .number()
      .min(-90, "Latitude must be between -90 and 90")
      .max(90, "Latitude must be between -90 and 90"),
    venueLongitude: z
      .number()
      .min(-180, "Longitude must be between -180 and 180")
      .max(180, "Longitude must be between -180 and 180"),
    venueName: z
      .string()
      .min(3, "Venue name must be at least 3 characters")
      .max(200, "Venue name must not exceed 200 characters"),
    venueAddress: z
      .string()
      .max(500, "Venue address must not exceed 500 characters")
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
    checkInBufferMins: z
      .number()
      .int("Buffer must be a whole number")
      .min(0, "Buffer cannot be negative")
      .max(1440, "Buffer cannot exceed 24 hours (1440 minutes)")
      .default(30),
    checkOutBufferMins: z
      .number()
      .int("Buffer must be a whole number")
      .min(0, "Buffer cannot be negative")
      .max(1440, "Buffer cannot exceed 24 hours (1440 minutes)")
      .default(30),
  })
  .refine((data) => data.startDateTime < data.endDateTime, {
    message: "Start time must be before end time",
    path: ["startDateTime"],
  });

export type CreateEventInput = z.infer<typeof createEventSchema>;

/**
 * Zod schema for event update
 * Based on event-update.json contract
 * All fields optional (partial update)
 */
export const updateEventSchema = z
  .object({
    name: z
      .string()
      .min(3, "Event name must be at least 3 characters")
      .max(200, "Event name must not exceed 200 characters")
      .optional(),
    description: z
      .string()
      .max(2000, "Description must not exceed 2000 characters")
      .optional()
      .nullable(),
    startDateTime: z.coerce.date().optional(),
    endDateTime: z.coerce.date().optional(),
    venueLatitude: z
      .number()
      .min(-90, "Latitude must be between -90 and 90")
      .max(90, "Latitude must be between -90 and 90")
      .optional(),
    venueLongitude: z
      .number()
      .min(-180, "Longitude must be between -180 and 180")
      .max(180, "Longitude must be between -180 and 180")
      .optional(),
    venueName: z
      .string()
      .min(3, "Venue name must be at least 3 characters")
      .max(200, "Venue name must not exceed 200 characters")
      .optional(),
    venueAddress: z
      .string()
      .max(500, "Venue address must not exceed 500 characters")
      .optional()
      .nullable(),
    campus: z
      .enum([
        "MainCampus",
        "MalimonoCampus",
        "MainitCampus",
        "ClaverCampus",
        "DelCarmenCampus",
      ])
      .optional(),
    checkInBufferMins: z
      .number()
      .int("Buffer must be a whole number")
      .min(0, "Buffer cannot be negative")
      .max(1440, "Buffer cannot exceed 24 hours")
      .optional(),
    checkOutBufferMins: z
      .number()
      .int("Buffer must be a whole number")
      .min(0, "Buffer cannot be negative")
      .max(1440, "Buffer cannot exceed 24 hours")
      .optional(),
    status: z.enum(["Active", "Completed", "Cancelled"]).optional(),
  })
  .refine(
    (data) => {
      // If both start and end are provided, validate their relationship
      if (data.startDateTime && data.endDateTime) {
        return data.startDateTime < data.endDateTime;
      }
      return true;
    },
    {
      message: "Start time must be before end time",
      path: ["startDateTime"],
    },
  );

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

/**
 * Zod schema for QR regeneration
 */
export const regenerateQRSchema = z.object({
  reason: z
    .string()
    .max(500, "Reason must not exceed 500 characters")
    .optional(),
});

export type RegenerateQRInput = z.infer<typeof regenerateQRSchema>;
