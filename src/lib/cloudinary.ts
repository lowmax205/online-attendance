import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER;

/**
 * Upload a photo (JPEG) to Cloudinary
 * @param base64 - Base64 encoded image string (with data:image/jpeg;base64, prefix)
 * @param folder - Subfolder path (e.g., "attendance/{eventId}/{userId}")
 * @returns Cloudinary secure URL
 */
export async function uploadPhoto(
  base64: string,
  folder: string,
  publicId?: string,
): Promise<string> {
  try {
    const fullFolder = `${CLOUDINARY_FOLDER}/${folder}`;

    const result = await cloudinary.uploader.upload(base64, {
      folder: fullFolder,
      resource_type: "image",
      format: "jpg",
      quality: "auto",
      fetch_format: "auto",
      flags: "progressive",
      transformation: [
        { width: 1200, height: 1600, crop: "limit" },
        { quality: "auto:good" },
      ],
      ...(publicId ? { public_id: publicId } : {}),
    });

    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary photo upload failed:", error);
    throw new Error("Failed to upload photo to Cloudinary");
  }
}

/**
 * Upload a signature (transparent PNG) to Cloudinary
 * @param base64 - Base64 encoded PNG string (with data:image/png;base64, prefix)
 * @param folder - Subfolder path (e.g., "attendance/{eventId}/{userId}")
 * @returns Cloudinary secure URL
 */
export async function uploadSignature(
  base64: string,
  folder: string,
  publicId?: string,
): Promise<string> {
  try {
    const fullFolder = `${CLOUDINARY_FOLDER}/${folder}`;

    const result = await cloudinary.uploader.upload(base64, {
      folder: fullFolder,
      resource_type: "image",
      format: "png",
      quality: "auto",
      background: "transparent",
      transformation: [
        { width: 800, height: 400, crop: "limit" },
        { quality: "auto:good" },
      ],
      ...(publicId ? { public_id: publicId } : {}),
    });

    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary signature upload failed:", error);
    throw new Error("Failed to upload signature to Cloudinary");
  }
}

/**
 * Delete an image from Cloudinary
 * @param publicId - Cloudinary public ID (e.g., "event-attendance-storage/events/abc123/qr_123456.png")
 * @returns Success status
 */
export async function deleteImage(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok";
  } catch (error) {
    console.error("Cloudinary image deletion failed:", error);
    return false;
  }
}

/**
 * Upload QR code image to Cloudinary
 * @param base64 - Base64 encoded PNG string
 * @param folder - Subfolder path (e.g., "events/{eventId}")
 * @param filename - Filename (e.g., "qr_123456.png")
 * @returns Cloudinary secure URL
 */
export async function uploadQRCode(
  base64: string,
  folder: string,
  filename: string,
): Promise<string> {
  try {
    const fullFolder = `${CLOUDINARY_FOLDER}/${folder}`;

    const result = await cloudinary.uploader.upload(base64, {
      folder: fullFolder,
      public_id: filename.replace(".png", ""),
      resource_type: "image",
      format: "png",
      quality: "auto",
      transformation: [
        { width: 800, height: 800, crop: "limit" },
        { quality: "auto:best" },
      ],
    });

    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary QR code upload failed:", error);
    throw new Error("Failed to upload QR code to Cloudinary");
  }
}
