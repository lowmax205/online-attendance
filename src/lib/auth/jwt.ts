import { SignJWT, jwtVerify } from "jose";

/**
 * JWT Configuration
 * Uses jose library for Next.js Edge Runtime compatibility
 */

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-in-production",
);

const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRY || "1h";
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "30d";

/**
 * JWT Payload interface
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: "Student" | "Moderator" | "Administrator";
  hasProfile: boolean;
  accountStatus?: "ACTIVE" | "SUSPENDED";
  type: "access" | "refresh";
}

/**
 * Parse time string to seconds
 * Supports: "1h", "30d", "15m", "7d", etc.
 */
function parseTimeToSeconds(timeString: string): number {
  const match = timeString.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid time format: ${timeString}`);
  }

  const [, value, unit] = match;
  const num = parseInt(value, 10);

  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
  };

  return num * multipliers[unit];
}

/**
 * Generate an access token
 * Short-lived token for API authentication
 */
export async function generateAccessToken(
  payload: Omit<JWTPayload, "type">,
): Promise<string> {
  const expiresIn = parseTimeToSeconds(ACCESS_TOKEN_EXPIRY);

  return new SignJWT({ ...payload, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn)
    .sign(JWT_SECRET);
}

/**
 * Generate a refresh token
 * Long-lived token for obtaining new access tokens
 */
export async function generateRefreshToken(
  payload: Omit<JWTPayload, "type">,
): Promise<string> {
  const expiresIn = parseTimeToSeconds(REFRESH_TOKEN_EXPIRY);

  return new SignJWT({ ...payload, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn)
    .sign(JWT_SECRET);
}

/**
 * Verify and decode a JWT token
 * Returns null if token is invalid or expired
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return payload as any as JWTPayload;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

/**
 * Extract token expiration time
 * Returns Unix timestamp (seconds) or null if invalid
 */
export async function getTokenExpiry(token: string): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.exp || null;
  } catch {
    return null;
  }
}
