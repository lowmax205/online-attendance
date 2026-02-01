"use server";

import path from "node:path";

import { getCurrentUser } from "@/lib/auth/server";
import { uploadFileToR2 } from "@/lib/cloudflare-r2";
import { uploadPhoto } from "@/lib/cloudinary";
import { db } from "@/lib/db";
import { saveProfileImageLocally } from "@/lib/local-download";
import { revalidatePath, revalidateTag } from "next/cache";
import { randomUUID } from "crypto";
import { CACHE_TAGS } from "@/lib/cache";

interface UpdateProfileResult {
  success: boolean;
  message: string;
  profilePictureUrl?: string | null;
  documentUrls?: string[];
}

export async function updateProfile(
  formData: FormData,
): Promise<UpdateProfileResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Unauthorized" };
    }

    // Extract form data
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const contactNumber = (formData.get("contactNumber") as string) || null;
    const department = formData.get("department") as string;
    const campus = formData.get("campus") as string;
    const course = formData.get("course") as string;
    const yearLevel = parseInt(formData.get("yearLevel") as string, 10);
    const section = (formData.get("section") as string) || null;
    const studentId = formData.get("studentId") as string;
    const profilePicture = formData.get("profilePicture") as File | null;

    const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
    const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10 MB

    // Validate required fields
    if (
      !firstName ||
      !lastName ||
      !department ||
      !campus ||
      !course ||
      !yearLevel ||
      !studentId
    ) {
      return { success: false, message: "Missing required fields" };
    }

    const MIME_EXTENSION_MAP: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "application/pdf": ".pdf",
    };

    const resolveExtension = (file: File, fallback: string) => {
      const extFromName = file.name ? path.extname(file.name) : "";
      if (extFromName) {
        return extFromName.toLowerCase();
      }
      const mapped = MIME_EXTENSION_MAP[file.type];
      if (mapped) {
        return mapped;
      }
      return fallback;
    };

    const buildFileName = (
      prefix: "profile" | "document",
      file: File,
      index?: number,
    ) => {
      const fallbackExt = prefix === "document" ? ".pdf" : ".jpg";
      const extension = resolveExtension(file, fallbackExt);
      const timestamp = Date.now();
      const suffix =
        typeof index === "number"
          ? `${user.userId}-${timestamp}-${index}`
          : `${user.userId}-${timestamp}`;
      return `${prefix}-${suffix}${extension}`;
    };

    // Handle profile picture upload
    let profilePictureUrl: string | undefined;
    if (profilePicture && profilePicture.size > 0) {
      if (profilePicture.size > MAX_PROFILE_IMAGE_SIZE) {
        return {
          success: false,
          message: "Profile picture must be 5 MB or smaller",
        };
      }

      if (!profilePicture.type.startsWith("image/")) {
        return {
          success: false,
          message: "Profile picture must be an image file",
        };
      }

      try {
        try {
          await saveProfileImageLocally({
            file: profilePicture,
            firstName,
            lastName,
            identifier: studentId || user.userId,
          });
        } catch (error) {
          console.warn("Local profile image save failed:", error);
        }

        const arrayBuffer = await profilePicture.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const dataUri = `data:${profilePicture.type};base64,${base64}`;
        const publicId = buildFileName("profile", profilePicture)
          .replace(/\.[^.]+$/, "")
          .replace(/\s+/g, "-");
        const uploadedUrl = await uploadPhoto(
          dataUri,
          `profiles/${user.userId}`,
          publicId,
        );
        profilePictureUrl = uploadedUrl;
      } catch (error) {
        console.error("Failed to upload profile picture:", error);
        return { success: false, message: "Failed to upload profile picture" };
      }
    }

    // Handle document uploads
    const documentUrls: string[] = [];
    let docIndex = 0;
    while (formData.has(`document_${docIndex}`)) {
      const document = formData.get(`document_${docIndex}`) as File;
      if (document && document.size > 0) {
        if (document.size > MAX_DOCUMENT_SIZE) {
          console.warn(
            `Document ${docIndex} exceeds the 10 MB limit and will be skipped`,
          );
          docIndex++;
          continue;
        }

        // Only allow PDF and JPG/JPEG files
        const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg"];
        const fileExtension = document.name
          ? path.extname(document.name).toLowerCase()
          : "";
        const isValidType =
          allowedTypes.includes(document.type) ||
          fileExtension === ".pdf" ||
          fileExtension === ".jpg" ||
          fileExtension === ".jpeg";

        if (!isValidType) {
          console.warn(
            `Document ${docIndex} skipped due to unsupported type: ${document.type} (${fileExtension})`,
          );
          docIndex++;
          continue;
        }

        try {
          const documentFileName = buildFileName(
            "document",
            document,
            docIndex,
          );
          const uploadResult = await uploadFileToR2(document, {
            folder: `Profile/${user.userId}/documents`,
            filename: documentFileName,
          });
          documentUrls.push(uploadResult.url);
        } catch (error) {
          console.error(`Failed to upload document ${docIndex}:`, error);
        }
      }
      docIndex++;
    }

    // Update user basic info
    await db.user.update({
      where: { id: user.userId },
      data: {
        firstName,
        lastName,
      },
    });

    // Update or create profile
    const existingProfile = await db.userProfile.findUnique({
      where: { userId: user.userId },
    });

    type ProfileSnapshot = {
      profilePictureUrl: string | null;
      documentUrls: string[];
    };

    let updatedProfile: ProfileSnapshot | null = existingProfile
      ? {
          profilePictureUrl: existingProfile.profilePictureUrl ?? null,
          documentUrls: existingProfile.documentUrls,
        }
      : null;

    if (existingProfile) {
      const nextDocumentUrls =
        documentUrls.length > 0
          ? [...existingProfile.documentUrls, ...documentUrls]
          : existingProfile.documentUrls;

      const updated = await db.userProfile.update({
        where: { userId: user.userId },
        data: {
          studentId,
          department: department as
            | "CCIS"
            | "COE"
            | "CAS"
            | "CAAS"
            | "CTE"
            | "COT",
          campus: campus as
            | "MainCampus"
            | "MalimonoCampus"
            | "MainitCampus"
            | "ClaverCampus"
            | "DelCarmenCampus",
          course,
          yearLevel,
          section,
          contactNumber,
          ...(profilePictureUrl && { profilePictureUrl }),
          documentUrls: nextDocumentUrls,
        },
        select: {
          profilePictureUrl: true,
          documentUrls: true,
        },
      });
      updatedProfile = {
        profilePictureUrl: updated.profilePictureUrl,
        documentUrls: updated.documentUrls,
      };
    } else {
      const created = await db.userProfile.create({
        data: {
          id: randomUUID(),
          userId: user.userId,
          studentId,
          department: department as
            | "CCIS"
            | "COE"
            | "CAS"
            | "CAAS"
            | "CTE"
            | "COT",
          campus: campus as
            | "MainCampus"
            | "MalimonoCampus"
            | "MainitCampus"
            | "ClaverCampus"
            | "DelCarmenCampus",
          course,
          yearLevel,
          section,
          contactNumber,
          ...(profilePictureUrl && { profilePictureUrl }),
          documentUrls: documentUrls.length > 0 ? documentUrls : [],
          updatedAt: new Date(),
        },
        select: {
          profilePictureUrl: true,
          documentUrls: true,
        },
      });
      updatedProfile = {
        profilePictureUrl: created.profilePictureUrl,
        documentUrls: created.documentUrls,
      };
    }

    revalidatePath("/profile");
    revalidateTag(CACHE_TAGS.SESSION);
    return {
      success: true,
      message: "Profile updated successfully",
      profilePictureUrl:
        profilePictureUrl ?? updatedProfile?.profilePictureUrl ?? null,
      documentUrls: documentUrls.length > 0 ? documentUrls : undefined,
    };
  } catch (error) {
    console.error("Profile update error:", error);
    return { success: false, message: "Failed to update profile" };
  }
}
