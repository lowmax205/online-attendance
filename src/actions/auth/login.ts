"use server";

import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/hash";
import { createSession } from "@/lib/auth/session";
import { checkAuthRateLimit } from "@/lib/rate-limit";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import type { AuthResponse } from "@/lib/types/auth";
import { randomUUID } from "crypto";
import {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
} from "@/lib/auth/cookies";

/**
 * Login Server Action
 * Authenticates user with email and password
 * Includes rate limiting and session management
 */
export async function login(data: LoginInput): Promise<AuthResponse> {
  try {
    // 1. Validate input
    const validationResult = loginSchema.safeParse(data);
    if (!validationResult.success) {
      return {
        success: false,
        message: validationResult.error.issues[0].message,
      };
    }

    const { email, password } = validationResult.data;

    // 2. Rate limiting check
    const rateLimitResult = await checkAuthRateLimit(email);
    if (!rateLimitResult.success) {
      return {
        success: false,
        message: `Too many login attempts. Please try again after ${rateLimitResult.reset.toLocaleTimeString()}.`,
      };
    }

    // 3. Find user
    const user = await db.user.findUnique({
      where: { email },
      include: { UserProfile: true },
    });

    if (!user) {
      return {
        success: false,
        message: "Invalid email or password.",
      };
    }

    // 4. Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return {
        success: false,
        message: "Invalid email or password.",
      };
    }

    // 4.5. Check temporary password usage and lock if exceeded
    if (user.temporaryPassword) {
      const isTempPassword = await verifyPassword(
        password,
        user.temporaryPassword,
      );

      if (isTempPassword) {
        // Increment usage count
        const newUsageCount = user.temporaryPasswordUsageCount + 1;

        if (newUsageCount > 3) {
          // Lock the account
          await db.user.update({
            where: { id: user.id },
            data: {
              accountStatus: "SUSPENDED",
              statusChangeReason:
                "Account locked: Exceeded temporary password usage limit (3 attempts)",
              suspendedAt: new Date(),
            },
          });

          return {
            success: false,
            message:
              "Your account has been locked due to exceeding temporary password usage limit. Please contact an administrator.",
          };
        }

        // Update usage count
        await db.user.update({
          where: { id: user.id },
          data: {
            temporaryPasswordUsageCount: newUsageCount,
          },
        });

        // Warn user to change password
        if (newUsageCount === 3) {
          // This is their last login with temp password
          // We'll handle this in the response
        }
      }
    }

    // 5. Check if user has profile
    const hasProfile = !!user.UserProfile;
    const profilePictureUrl = user.UserProfile?.profilePictureUrl ?? null;

    // 6. Check account status (T058)
    if (user.accountStatus === "SUSPENDED") {
      return {
        success: false,
        message: "Your account has been suspended. Please contact support.",
      };
    }

    if (user.deletedAt !== null) {
      return {
        success: false,
        message: "Account not found.",
      };
    }

    const headersList = await headers();
    const rawForwardedFor = headersList.get("x-forwarded-for");
    const ipAddress = rawForwardedFor
      ? rawForwardedFor.split(",")[0]?.trim() || null
      : headersList.get("x-real-ip") || null;
    const userAgent = headersList.get("user-agent") || null;

    const loginTimestamp = new Date();

    await db.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: loginTimestamp,
      },
      select: { id: true },
    });

    // 7. Create session
    const { session, accessToken, refreshToken } = await createSession({
      id: user.id,
      email: user.email,
      role: user.role,
      hasProfile,
      accountStatus: user.accountStatus,
    });

    if (ipAddress || userAgent) {
      await db.session.update({
        where: { id: session.id },
        data: {
          ipAddress: ipAddress || undefined,
          userAgent: userAgent || undefined,
        },
      });
    }

    // 8. Set cookies
    const cookieStore = await cookies();
    cookieStore.set("accessToken", accessToken, {
      ...getAccessTokenCookieOptions(),
    });

    cookieStore.set("refreshToken", refreshToken, {
      ...getRefreshTokenCookieOptions(),
    });

    // Log successful login
    await db.securityLog.create({
      data: {
        id: randomUUID(),
        eventType: "LOGIN",
        userId: user.id,
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
      },
    });

    return {
      success: true,
      message: "Login successful!",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        hasProfile,
        profilePictureUrl,
      },
      requiresProfile: !hasProfile,
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
    };
  }
}
