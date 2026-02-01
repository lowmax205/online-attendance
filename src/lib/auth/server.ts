"use server";

import { cookies } from "next/headers";
import { verifyToken, type JWTPayload } from "@/lib/auth/jwt";

/**
 * Get the current authenticated user from the access token cookie
 * @returns JWT payload with user information or null if not authenticated
 */
export async function getCurrentUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  if (!accessToken) {
    return null;
  }

  const payload = await verifyToken(accessToken);
  return payload;
}

/**
 * Require authentication - throws error if not authenticated
 * @returns JWT payload with user information
 */
export async function requireAuth(): Promise<JWTPayload> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  return user;
}

/**
 * Require specific role - throws error if user doesn't have required role
 * @param roles - Array of allowed roles
 * @returns JWT payload with user information
 */
export async function requireRole(
  roles: Array<"Student" | "Moderator" | "Administrator">,
): Promise<JWTPayload> {
  const user = await requireAuth();

  if (!roles.includes(user.role)) {
    throw new Error(`Forbidden: ${roles.join(" or ")} role required`);
  }

  return user;
}
