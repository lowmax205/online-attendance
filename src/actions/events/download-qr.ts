"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/server";
import { generateQRCode } from "@/lib/qr-generator";

/**
 * Return a downloadable QR code (data URL + filename) for an event.
 * Generates a fresh image from the stored payload if the URL is missing.
 */
export async function getEventQRForDownload(eventId: string) {
  try {
    const user = await requireRole(["Moderator", "Administrator"]);

    const event = await db.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        qrCodeUrl: true,
        qrCodePayload: true,
      },
    });

    if (!event) {
      return { success: false, error: "Event not found" } as const;
    }

    // Prefer the stored QR image URL if available; otherwise generate on the fly.
    let dataUrl: string;
    if (event.qrCodeUrl) {
      dataUrl = event.qrCodeUrl;
    } else {
      if (!event.qrCodePayload) {
        return {
          success: false,
          error: "QR payload is missing for this event",
        } as const;
      }
      dataUrl = await generateQRCode(event.qrCodePayload);
    }

    const safeName = event.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const filename = `${safeName || "event"}-${event.id}.png`;

    return {
      success: true,
      data: {
        dataUrl,
        filename,
      },
      requestedBy: user.userId,
    } as const;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch QR code",
    } as const;
  }
}
