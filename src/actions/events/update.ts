"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/server";
import { eventUpdateSchema } from "@/lib/validations/event-management";
import { generateQRCode, generateQRPayload } from "@/lib/qr-generator";
import { uploadQRCode, deleteImage } from "@/lib/cloudinary";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { randomUUID } from "crypto";

/**
 * T022: Update an existing event with editHistory tracking
 * Phase 3.4 - Extended from Phase 2
 * Regenerates QR code if venue coordinates change
 * @param eventId - Event ID to update
 * @param input - Partial event data to update
 * @returns Updated event
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateEvent(eventId: string, input: any) {
  try {
    // Require Moderator or Administrator role
    const user = await requireRole(["Moderator", "Administrator"]);

    // Validate input
    const validatedData = eventUpdateSchema.parse(input);

    // Get existing event
    const existingEvent = await db.event.findUnique({
      where: { id: eventId },
    });

    if (!existingEvent) {
      return {
        success: false,
        error: "Event not found",
      };
    }

    // Moderator scope: can only edit own events (FR-026)
    if (
      user.role === "Moderator" &&
      existingEvent.createdById !== user.userId
    ) {
      return {
        success: false,
        error: "Forbidden: You can only edit events you created",
      };
    }

    // Cannot update completed event
    if (existingEvent.status === "Completed") {
      return {
        success: false,
        error: "Cannot update completed event",
      };
    }

    // Check if venue coordinates changed
    const venueChanged =
      (validatedData.venueLatitude !== undefined &&
        validatedData.venueLatitude !== existingEvent.venueLatitude) ||
      (validatedData.venueLongitude !== undefined &&
        validatedData.venueLongitude !== existingEvent.venueLongitude);

    let qrCodeUrl = existingEvent.qrCodeUrl;
    let qrCodePayload = existingEvent.qrCodePayload;

    // Regenerate QR code if venue changed
    if (venueChanged) {
      // Generate new QR payload
      qrCodePayload = generateQRPayload(eventId);

      // Generate QR code image
      const qrDataUrl = await generateQRCode(qrCodePayload);

      // Delete old QR code from Cloudinary if exists
      if (
        existingEvent.qrCodeUrl &&
        !existingEvent.qrCodeUrl.startsWith("data:")
      ) {
        try {
          // Extract public ID from Cloudinary URL
          const urlParts = existingEvent.qrCodeUrl.split("/");
          const publicIdWithExt = urlParts.slice(-3).join("/"); // folder/subfolder/filename.ext
          const publicId = publicIdWithExt.replace(/\.[^/.]+$/, ""); // Remove extension
          await deleteImage(publicId);
        } catch (error) {
          console.error("Failed to delete old QR code:", error);
          // Continue even if deletion fails
        }
      }

      // Upload new QR code to Cloudinary
      const cloudinaryFolder = `events/${eventId}`;
      qrCodeUrl = await uploadQRCode(
        qrDataUrl,
        cloudinaryFolder,
        `qr_${Date.now()}`,
      );
    }

    // Build editHistory entry (FR-017)
    const changedFields = Object.keys(validatedData);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const changes: Record<string, { from: any; to: any }> = {};

    changedFields.forEach((field) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const oldValue = (existingEvent as Record<string, any>)[field];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newValue = (validatedData as Record<string, any>)[field];
      if (oldValue !== newValue && newValue !== undefined) {
        changes[field] = { from: oldValue, to: newValue };
      }
    });

    const editHistoryEntry = {
      editedBy: user.userId,
      editedAt: new Date().toISOString(),
      fields: changedFields,
      changes,
    };

    // Append to existing editHistory or create new array
    const currentHistory = existingEvent.editHistory
      ? Array.isArray(existingEvent.editHistory)
        ? existingEvent.editHistory
        : [existingEvent.editHistory]
      : [];
    const newEditHistory = [...currentHistory, editHistoryEntry];

    // Update event
    const updatedEvent = await db.event.update({
      where: { id: eventId },
      data: {
        ...validatedData,
        editHistory: newEditHistory as Prisma.InputJsonValue,
        ...(venueChanged && {
          qrCodeUrl,
          qrCodePayload,
        }),
      },
    });

    // Log security event (FR-010)
    const headersList = await headers();
    await db.securityLog.create({
      data: {
        id: randomUUID(),
        userId: user.userId,
        eventType: "EVENT_EDITED",
        metadata: {
          eventId,
          eventName: existingEvent.name,
          fields: changedFields,
        },
        ipAddress: headersList.get("x-forwarded-for") || undefined,
        userAgent: headersList.get("user-agent") || undefined,
      },
    });

    return {
      success: true,
      data: updatedEvent,
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
      error: "Failed to update event",
    };
  }
}
