/**
 * Security Headers Configuration
 * Implements CSP, HSTS, and other security best practices
 */

/**
 * Content Security Policy (CSP)
 * Prevents XSS attacks by controlling which resources can be loaded
 */
export function getCSPHeader(): string {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-inline needed for Next.js
    "style-src 'self' 'unsafe-inline'", // unsafe-inline needed for Tailwind
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://vercel-insights.com", // Add your API domains
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");

  return csp;
}

/**
 * Get all security headers
 * Can be used in middleware or next.config.ts
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    // Content Security Policy
    "Content-Security-Policy": getCSPHeader(),

    // Prevent clickjacking
    "X-Frame-Options": "DENY",

    // Prevent MIME type sniffing
    "X-Content-Type-Options": "nosniff",

    // Enable browser XSS protection (legacy but still useful)
    "X-XSS-Protection": "1; mode=block",

    // Referrer Policy
    "Referrer-Policy": "strict-origin-when-cross-origin",

    // Permissions Policy (formerly Feature Policy)
    "Permissions-Policy": [
      // Allow geolocation for same-origin to enable location features
      "geolocation=(self)",
      // Keep camera and microphone disabled by default
      "camera=()",
      "microphone=()",
      "payment=()",
    ].join(", "),

    // HTTP Strict Transport Security (HSTS)
    // Only enable in production with HTTPS
    ...(process.env.NODE_ENV === "production"
      ? {
          "Strict-Transport-Security":
            "max-age=31536000; includeSubDomains; preload",
        }
      : {}),
  };
}

/**
 * CORS Configuration
 * For API routes that need to accept cross-origin requests
 */
export function getCORSHeaders(origin?: string): Record<string, string> {
  // Whitelist of allowed origins
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "http://localhost:3100",
    "https://easuniversity.site",
    "https://www.easuniversity.site",
    "https://k39nm9lb-3000.asse.devtunnels.ms/",
    // Add production domains here
  ];

  const isAllowed = origin && allowedOrigins.includes(origin);

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400", // 24 hours
  };
}
