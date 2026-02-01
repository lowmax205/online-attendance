import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate Limiting Configuration
 * Uses Upstash Redis for distributed rate limiting
 *
 * Strategy: Sliding window - 5 attempts per hour per email
 * This prevents brute-force attacks on login/registration
 */

// Initialize Redis client using Vercel KV environment variables
const redis = Redis.fromEnv();

/**
 * Rate limiter for authentication attempts
 * 5 attempts per hour per email address
 */
export const authRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 h"),
  analytics: true,
  prefix: "auth_ratelimit",
});

/**
 * Check if an email has exceeded rate limit
 * @param email - The email address to check
 * @returns Object with { success: boolean, remaining: number, reset: Date }
 */
export async function checkAuthRateLimit(email: string): Promise<{
  success: boolean;
  remaining: number;
  reset: Date;
}> {
  // Skip rate limiting in development mode for easier testing
  if (process.env.NODE_ENV === "development") {
    return {
      success: true,
      remaining: 5,
      reset: new Date(Date.now() + 3600000), // 1 hour from now
    };
  }

  const identifier = `auth:${email.toLowerCase()}`;
  const { success, remaining, reset } = await authRateLimiter.limit(identifier);

  return {
    success,
    remaining,
    reset: new Date(reset),
  };
}

/**
 * Reset rate limit for an email (e.g., after successful login)
 * @param email - The email address to reset
 */
export async function resetAuthRateLimit(email: string): Promise<void> {
  const identifier = `auth:${email.toLowerCase()}`;
  // Upstash doesn't have a direct reset, so we'd need to wait for expiry
  // Or manually delete the key (not recommended for sliding window)
  // For now, this is a placeholder for future implementation
  await redis.del(`auth_ratelimit:${identifier}`);
}

/**
 * Generic rate limiter factory
 * Use this to create custom rate limiters for other features
 */
export function createRateLimiter(
  requests: number,
  window: Duration,
  prefix: string,
) {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
    prefix,
  });
}

/**
 * Rate limiter for QR code validation
 * Token bucket algorithm: 10 QR scans per minute per IP address
 */
export const qrValidationRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.tokenBucket(10, "1 m", 10),
  analytics: true,
  prefix: "qr_validation",
});

/**
 * Check if an IP address has exceeded QR validation rate limit
 * @param ipAddress - The IP address to check
 * @returns Object with { success: boolean, remaining: number, reset: Date, error?: string }
 */
export async function checkQRValidationRateLimit(ipAddress: string): Promise<{
  success: boolean;
  remaining: number;
  reset: Date;
  error?: string;
}> {
  const identifier = `qr:${ipAddress}`;
  const { success, remaining, reset } =
    await qrValidationRateLimiter.limit(identifier);

  return {
    success,
    remaining,
    reset: new Date(reset),
    error: success
      ? undefined
      : "Rate limit exceeded. Maximum 10 QR scans per minute.",
  };
}
