"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth/jwt";
import { profileSchema, type ProfileInput } from "@/lib/validations/auth";
import { createSession } from "@/lib/auth/session";
import {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
} from "@/lib/auth/cookies";
import { randomUUID } from "crypto";

interface ProfileResponse {
  success: boolean;
  message: string;
}

/**
 * Create Profile Server Action
 * Creates a user profile after registration
 * Requires authenticated user (checks access token)
 */
export async function createProfile(
  data: ProfileInput,
): Promise<ProfileResponse> {
  try {
    // 1. Validate input
    const validationResult = profileSchema.safeParse(data);
    if (!validationResult.success) {
      return {
        success: false,
        message: validationResult.error.issues[0].message,
      };
    }

    const {
      studentId,
      department,
      course,
      yearLevel,
      section,
      contactNumber,
      campus,
    } = validationResult.data;

    // 2. Get authenticated user from cookie
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;

    if (!accessToken) {
      return {
        success: false,
        message: "You must be logged in to create a profile.",
      };
    }

    const payload = await verifyToken(accessToken);
    if (!payload || payload.type !== "access") {
      return {
        success: false,
        message: "Invalid authentication. Please log in again.",
      };
    }

    // 3. Check if user already has a profile
    const existingProfile = await db.userProfile.findUnique({
      where: { userId: payload.userId },
    });

    if (existingProfile) {
      return {
        success: false,
        message:
          "You already have a profile. Use the edit feature to update it.",
      };
    }

    // 4. Check if student ID is already taken
    const duplicateStudentId = await db.userProfile.findUnique({
      where: { studentId },
    });

    if (duplicateStudentId) {
      return {
        success: false,
        message: "This Student ID is already registered to another account.",
      };
    }

    // 5. Create profile
    await db.userProfile.create({
      data: {
        id: randomUUID(),
        userId: payload.userId,
        studentId,
        department,
        campus,
        course,
        yearLevel,
        section: section || null,
        contactNumber: contactNumber || null,
        updatedAt: new Date(),
      },
    });

    // 6. Get user details for session update
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return {
        success: false,
        message: "User not found.",
      };
    }

    // 7. Create new session with hasProfile: true
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await createSession({
        id: user.id,
        email: user.email,
        role: user.role,
        hasProfile: true,
      });

    // 8. Update cookies with new tokens
    cookieStore.set("accessToken", newAccessToken, {
      ...getAccessTokenCookieOptions(),
    });

    cookieStore.set("refreshToken", newRefreshToken, {
      ...getRefreshTokenCookieOptions(),
    });

    // 9. Log security event
    await db.securityLog.create({
      data: {
        id: randomUUID(),
        userId: payload.userId,
        eventType: "REGISTRATION",
        metadata: {
          studentId,
          department,
          course,
        },
      },
    });

    return {
      success: true,
      message: "Profile created successfully!",
    };
  } catch (error) {
    console.error("Profile creation error:", error);
    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
    };
  }
}
