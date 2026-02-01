import QRCode from "qrcode";

/**
 * Generate QR code as data URL
 * @param payload - QR code payload (e.g., "https://app.example.com/attendance/{eventId}?t=...&src=qr")
 * @returns Promise<string> Data URL (data:image/png;base64,...)
 */
export async function generateQRCode(payload: string): Promise<string> {
  try {
    // Generate QR code with high error correction
    const dataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: "H",
      type: "image/png",
      width: 512,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    return dataUrl;
  } catch (error) {
    console.error("QR code generation failed:", error);
    throw new Error("Failed to generate QR code");
  }
}

/**
 * Generate QR code payload for an event
 * @param eventId - Event ID
 * @returns QR code payload string
 */
export function generateQRPayload(eventId: string): string {
  const timestamp = Date.now();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is not configured");
  }

  try {
    const url = new URL(`/attendance/${eventId}`, baseUrl);
    url.searchParams.set("t", timestamp.toString());
    url.searchParams.set("src", "qr");

    return url.toString();
  } catch (error) {
    console.error(`Failed to construct URL with baseUrl: ${baseUrl}`, error);
    throw new Error(`Invalid base URL configuration: ${baseUrl}`);
  }
}

/**
 * Parse QR code payload
 * @param payload - QR code payload string
 * @returns Parsed components or null if invalid
 */
export function parseQRPayload(payload: string): {
  eventId: string;
  timestamp: number | null;
  source?: string;
} | null {
  try {
    const url = new URL(payload);
    const attendanceMatch = url.pathname.match(/\/attendance\/([a-z0-9]+)/);

    if (!attendanceMatch) {
      return null;
    }

    const eventId = attendanceMatch[1];
    const timestampParam = url.searchParams.get("t");
    const sourceParam = url.searchParams.get("src") || undefined;

    return {
      eventId,
      timestamp: timestampParam ? parseInt(timestampParam, 10) : null,
      source: sourceParam,
    };
  } catch (error) {
    if (error instanceof TypeError) {
      const legacyMatch = payload.match(/^attendance:([a-z0-9]+):([0-9]+)$/);

      if (!legacyMatch) {
        return null;
      }

      return {
        eventId: legacyMatch[1],
        timestamp: parseInt(legacyMatch[2], 10),
        source: undefined,
      };
    }

    console.error("Failed to parse QR payload:", error);
    return null;
  }
}
