"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/hash";
import { createSession } from "@/lib/auth/session";
import { checkAuthRateLimit } from "@/lib/rate-limit";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import type { AuthResponse } from "@/lib/types/auth";
import { randomUUID } from "crypto";
import {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
} from "@/lib/auth/cookies";

/**
 * Register Server Action
 * Creates a new user account with email, password, and name
 * Includes rate limiting and duplicate email checking
 */
export async function register(data: RegisterInput): Promise<AuthResponse> {
  try {
    // 1. Validate input
    const validationResult = registerSchema.safeParse(data);
    if (!validationResult.success) {
      return {
        success: false,
        message: validationResult.error.issues[0].message,
      };
    }

    const { email, password, firstName, lastName } = validationResult.data;

    // 2. Rate limiting check
    const rateLimitResult = await checkAuthRateLimit(email);
    if (!rateLimitResult.success) {
      return {
        success: false,
        message: `Too many attempts. Please try again after ${rateLimitResult.reset.toLocaleTimeString()}.`,
      };
    }

    // 3. Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return {
        success: false,
        message: "An account with this email already exists.",
      };
    }

    // 4. Hash password
    const hashedPassword = await hashPassword(password);

    // 5. Create user (convert names to uppercase)
    const user = await db.user.create({
      data: {
        id: randomUUID(),
        email,
        passwordHash: hashedPassword,
        firstName: firstName.toUpperCase(),
        lastName: lastName.toUpperCase(),
        role: "Student", // Default role
        emailVerified: false,
      },
    });

    // 6. Create session (user doesn't have profile yet)
    const { accessToken, refreshToken } = await createSession({
      id: user.id,
      email: user.email,
      role: user.role,
      hasProfile: false,
      accountStatus: user.accountStatus,
    });

    // 7. Set cookies
    const cookieStore = await cookies();
    cookieStore.set("accessToken", accessToken, {
      ...getAccessTokenCookieOptions(),
    });

    cookieStore.set("refreshToken", refreshToken, {
      ...getRefreshTokenCookieOptions(),
    });

    // 8. Log security event
    await db.securityLog.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        eventType: "REGISTRATION",
        metadata: {
          email: user.email,
          role: user.role,
        },
      },
    });

    return {
      success: true,
      message: "Account created successfully!",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        hasProfile: false, // New user has no profile yet
        profilePictureUrl: null,
      },
      requiresProfile: true,
    };
  } catch (error) {
    console.error("Registration error:", error);
    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
    };
  }
}
