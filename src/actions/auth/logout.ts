"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { revokeSession } from "@/lib/auth/session";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

/**
 * Logout Server Action
 * Invalidates the current session and clears cookies
 */
export async function logout(): Promise<{ success: boolean; message: string }> {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refreshToken")?.value;

    // 1. Verify token and get session info
    if (refreshToken) {
      const session = await db.session.findUnique({
        where: { refreshToken },
      });

      if (session) {
        // 2. Revoke session
        await revokeSession(session.id);

        // 3. Log security event
        await db.securityLog.create({
          data: {
            id: randomUUID(),
            userId: session.userId,
            eventType: "LOGOUT",
            metadata: {
              sessionId: session.id,
            },
          },
        });
      }
    }

    // 4. Clear cookies (even if session not found)
    cookieStore.delete("accessToken");
    cookieStore.delete("refreshToken");

    // 5. Revalidate all paths to clear cached navigation and data
    revalidatePath("/", "layout");

    return {
      success: true,
      message: "Logged out successfully.",
    };
  } catch (error) {
    console.error("Logout error:", error);

    // Still clear cookies even if database operation fails
    const cookieStore = await cookies();
    cookieStore.delete("accessToken");
    cookieStore.delete("refreshToken");

    // Revalidate paths even on error
    revalidatePath("/", "layout");

    return {
      success: true,
      message: "Logged out successfully.",
    };
  }
}
