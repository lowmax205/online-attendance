"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/server";
import { regenerateQRSchema } from "@/lib/validations/event";
import { generateQRCode, generateQRPayload } from "@/lib/qr-generator";
import { uploadQRCode, deleteImage } from "@/lib/cloudinary";
import { ZodError } from "zod";
import { headers } from "next/headers";
import { randomUUID } from "crypto";

/**
 * Regenerate QR code for an existing event
 * Used for security concerns or venue changes
 * @param eventId - Event ID
 * @param input - Optional reason for regeneration
 * @returns New QR code information
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function regenerateQRCode(eventId: string, input?: any) {
  try {
    // Require Moderator or Administrator role
    const user = await requireRole(["Moderator", "Administrator"]);

    // Validate input
    const validatedData = input
      ? regenerateQRSchema.parse(input)
      : { reason: undefined };

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

    // Event must be Active
    if (existingEvent.status !== "Active") {
      return {
        success: false,
        error: `Cannot regenerate QR code for ${existingEvent.status} event`,
      };
    }

    // Store previous payload for audit trail
    const previousPayload = existingEvent.qrCodePayload;

    // Generate new QR payload
    const newPayload = generateQRPayload(eventId);

    // Generate QR code image
    const qrDataUrl = await generateQRCode(newPayload);

    // Delete old QR code from Cloudinary if exists
    if (
      existingEvent.qrCodeUrl &&
      !existingEvent.qrCodeUrl.startsWith("data:")
    ) {
      try {
        // Extract public ID from Cloudinary URL
        const urlParts = existingEvent.qrCodeUrl.split("/");
        const publicIdWithExt = urlParts.slice(-3).join("/");
        const publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");
        await deleteImage(publicId);
      } catch (error) {
        console.error("Failed to delete old QR code:", error);
        // Continue even if deletion fails
      }
    }

    // Upload new QR code to Cloudinary
    const cloudinaryFolder = `events/${eventId}`;
    const qrCodeUrl = await uploadQRCode(
      qrDataUrl,
      cloudinaryFolder,
      `qr_${Date.now()}`,
    );

    // Update event with new QR code
    const updatedEvent = await db.event.update({
      where: { id: eventId },
      data: {
        qrCodeUrl,
        qrCodePayload: newPayload,
        shortUrl: null,
      },
      select: {
        id: true,
        name: true,
        status: true,
        qrCodeUrl: true,
        qrCodePayload: true,
        shortUrl: true,
        updatedAt: true,
      },
    });

    // Log to SecurityLog
    const headersList = await headers();
    const ipAddress =
      headersList.get("x-forwarded-for") ||
      headersList.get("x-real-ip") ||
      undefined;
    const userAgent = headersList.get("user-agent") || undefined;

    await db.securityLog.create({
      data: {
        id: randomUUID(),
        userId: user.userId,
        eventType: "EVENT_EDITED",
        metadata: {
          eventId,
          eventName: existingEvent.name,
          previousPayload,
          newPayload,
          reason: validatedData.reason || "No reason provided",
        },
        ipAddress,
        userAgent,
      },
    });

    return {
      success: true,
      data: {
        qrCodeUrl: updatedEvent.qrCodeUrl,
        qrCodePayload: updatedEvent.qrCodePayload,
        shortUrl: updatedEvent.shortUrl,
        previousPayload,
        regeneratedAt: updatedEvent.updatedAt,
        event: {
          id: updatedEvent.id,
          name: updatedEvent.name,
          status: updatedEvent.status,
        },
      },
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
      error: "Failed to regenerate QR code",
    };
  }
}
