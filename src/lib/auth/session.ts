import { db } from "@/lib/db";
import { generateAccessToken, generateRefreshToken } from "./jwt";
import { randomUUID } from "crypto";

/**
 * Session Management Utilities
 * Handles database operations for user sessions
 */

// Temporary types until Prisma generates them
type User = {
  id: string;
  email: string;
  role: "Student" | "Moderator" | "Administrator";
  hasProfile?: boolean;
  accountStatus?: "ACTIVE" | "SUSPENDED";
};

type Session = {
  id: string;
  userId: string;
  refreshToken: string;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
};

/**
 * Create a new session for a user
 * Invalidates all existing sessions (single session per user policy)
 * @returns Session with access and refresh tokens
 */
export async function createSession(user: User): Promise<{
  session: Session;
  accessToken: string;
  refreshToken: string;
}> {
  // Invalidate all existing sessions for this user
  await db.session.updateMany({
    where: {
      userId: user.id,
      isRevoked: false,
    },
    data: {
      isRevoked: true,
    },
  });

  // Generate tokens
  const accessToken = await generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    hasProfile: user.hasProfile ?? false,
    accountStatus: user.accountStatus ?? "ACTIVE",
  });

  const refreshToken = await generateRefreshToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    hasProfile: user.hasProfile ?? false,
    accountStatus: user.accountStatus ?? "ACTIVE",
  });

  // Calculate expiry (30 days from now)
  const expiresAt = new Date();
  const refreshExpiry = process.env.JWT_REFRESH_EXPIRY || "30d";
  const days = parseInt(refreshExpiry.replace("d", ""), 10);
  expiresAt.setDate(expiresAt.getDate() + days);

  // Create new session in database
  const session = await db.session.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      refreshToken,
      expiresAt,
      isRevoked: false,
    },
  });

  return { session, accessToken, refreshToken };
}

/**
 * Validate a refresh token and return the associated session
 * @returns Session if valid, null otherwise
 */
export async function validateRefreshToken(
  refreshToken: string,
): Promise<Session | null> {
  const session = await db.session.findUnique({
    where: { refreshToken },
  });

  if (!session) {
    return null;
  }

  // Check if session is revoked
  if (session.isRevoked) {
    return null;
  }

  // Check if session is expired
  if (session.expiresAt < new Date()) {
    // Clean up expired session
    await db.session.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });
    return null;
  }

  return session;
}

/**
 * Revoke a session (logout)
 * @param sessionId - The session ID to revoke
 */
export async function revokeSession(sessionId: string): Promise<void> {
  await db.session.update({
    where: { id: sessionId },
    data: { isRevoked: true },
  });
}

/**
 * Revoke all sessions for a user
 * @param userId - The user ID whose sessions to revoke
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  await db.session.updateMany({
    where: { userId },
    data: { isRevoked: true },
  });
}

/**
 * Clean up expired sessions
 * Should be run periodically (e.g., daily cron job)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await db.session.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: new Date() } }, { isRevoked: true }],
    },
  });

  return result.count;
}
