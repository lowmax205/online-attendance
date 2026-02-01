"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth/server";
import { verifyPassword } from "@/lib/auth/hash";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { randomUUID } from "crypto";
import { headers } from "next/headers";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      ),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

interface ChangePasswordResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export async function changePassword(
  data: ChangePasswordInput,
): Promise<ChangePasswordResponse> {
  try {
    // Verify authentication
    const currentUser = await requireAuth();
    if (!currentUser) {
      return {
        success: false,
        error: "Unauthorized: Please log in",
      };
    }

    // Validate input
    const validatedData = changePasswordSchema.parse(data);

    // Get user with current password
    const user = await db.user.findUnique({
      where: { id: currentUser.userId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        temporaryPassword: true,
        accountStatus: true,
      },
    });

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(
      validatedData.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      return {
        success: false,
        error: "Current password is incorrect",
      };
    }

    // Check if new password is same as current
    const isSameAsOld = await verifyPassword(
      validatedData.newPassword,
      user.passwordHash,
    );

    if (isSameAsOld) {
      return {
        success: false,
        error: "New password must be different from your current password",
      };
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(validatedData.newPassword, 10);

    // Get headers for logging
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") || undefined;
    const userAgent = headersList.get("user-agent") || undefined;

    // Update password and clear temporary password fields
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        temporaryPassword: null,
        temporaryPasswordUsageCount: 0,
        temporaryPasswordCreatedAt: null,
      },
    });

    // Log password change
    await db.securityLog.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        eventType: "PASSWORD_CHANGE",
        metadata: {
          wasTemporary: !!user.temporaryPassword,
        },
        ipAddress,
        userAgent,
      },
    });

    return {
      success: true,
      message: "Password changed successfully",
    };
  } catch (error) {
    console.error("Change password error:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Validation error",
      };
    }

    return {
      success: false,
      error: "Failed to change password. Please try again.",
    };
  }
}
