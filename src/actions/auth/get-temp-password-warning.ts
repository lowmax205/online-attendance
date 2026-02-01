"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth/server";

/**
 * Get temporary password warning for the current user
 * Returns warning message if user is using a temporary password with limited attempts remaining
 */
export async function getTempPasswordWarning(): Promise<string | null> {
  try {
    const user = await requireAuth();

    // Fetch user's temporary password status
    const dbUser = await db.user.findUnique({
      where: { id: user.userId },
      select: {
        temporaryPassword: true,
        temporaryPasswordUsageCount: true,
      },
    });

    if (!dbUser) {
      return null;
    }

    // Check if user has a temporary password and usage count is high
    if (dbUser.temporaryPassword && dbUser.temporaryPasswordUsageCount >= 2) {
      const remainingLogins = 4 - dbUser.temporaryPasswordUsageCount;
      return `Warning: You are using a temporary password. You have ${remainingLogins} login(s) remaining. Please change your password in your profile settings.`;
    }

    return null;
  } catch (error) {
    console.error("Error fetching temp password warning:", error);
    return null;
  }
}
