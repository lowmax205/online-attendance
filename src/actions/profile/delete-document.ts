"use server";

import { getCurrentUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

interface DeleteDocumentResult {
  success: boolean;
  message: string;
  documentUrls?: string[];
}

export async function deleteDocument(
  documentUrl: string,
): Promise<DeleteDocumentResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Unauthorized" };
    }

    // Get the user's profile
    const profile = await db.userProfile.findUnique({
      where: { userId: user.userId },
      select: { documentUrls: true },
    });

    if (!profile) {
      return { success: false, message: "Profile not found" };
    }

    // Remove the document URL from the array
    const updatedDocumentUrls = profile.documentUrls.filter(
      (url) => url !== documentUrl,
    );

    // Update the profile with the new document URLs
    await db.userProfile.update({
      where: { userId: user.userId },
      data: {
        documentUrls: updatedDocumentUrls,
      },
    });

    revalidatePath("/profile");

    return {
      success: true,
      message: "Document deleted successfully",
      documentUrls: updatedDocumentUrls,
    };
  } catch (error) {
    console.error("Delete document error:", error);
    return { success: false, message: "Failed to delete document" };
  }
}
