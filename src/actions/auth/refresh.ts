"use server";

import { cookies } from "next/headers";
import { validateRefreshToken } from "@/lib/auth/session";
import { generateAccessToken, verifyToken } from "@/lib/auth/jwt";
import type { TokenRefreshResponse } from "@/lib/types/auth";
import { getAccessTokenCookieOptions } from "@/lib/auth/cookies";

/**
 * Refresh Token Server Action
 * Issues a new access token using a valid refresh token
 */
export async function refreshToken(): Promise<TokenRefreshResponse> {
  try {
    const cookieStore = await cookies();
    const refreshTokenValue = cookieStore.get("refreshToken")?.value;

    if (!refreshTokenValue) {
      return {
        success: false,
      };
    }

    // 1. Validate refresh token
    const session = await validateRefreshToken(refreshTokenValue);
    if (!session) {
      // Refresh token is invalid or expired
      cookieStore.delete("accessToken");
      cookieStore.delete("refreshToken");
      return {
        success: false,
      };
    }

    // 2. Verify the refresh token payload
    const payload = await verifyToken(refreshTokenValue);
    if (!payload || payload.type !== "refresh") {
      return {
        success: false,
      };
    }

    // 3. Generate new access token
    const newAccessToken = await generateAccessToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      hasProfile: payload.hasProfile,
      accountStatus: payload.accountStatus ?? "ACTIVE",
    });

    // 4. Update access token cookie
    cookieStore.set("accessToken", newAccessToken, {
      ...getAccessTokenCookieOptions(),
    });

    return {
      success: true,
      accessToken: newAccessToken,
    };
  } catch (error) {
    console.error("Token refresh error:", error);
    return {
      success: false,
    };
  }
}
