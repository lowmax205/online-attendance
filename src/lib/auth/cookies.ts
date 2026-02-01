const ACCESS_TOKEN_MAX_AGE = 60 * 60; // 1 hour
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const isProduction = process.env.NODE_ENV === "production";
const allowIframeAuth =
  process.env.NEXT_PUBLIC_DEV_ALLOW_IFRAME_AUTH === "true";

type AuthCookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax" | "none";
  maxAge: number;
  path: "/";
};

/**
 * Shared cookie configuration for auth tokens.
 * Allows opting into less restrictive SameSite rules during local
 * development (e.g. VS Code Simple Browser embeds) without
 * affecting production behaviour.
 */
function buildCookieOptions(maxAge: number): AuthCookieOptions {
  const sameSite: AuthCookieOptions["sameSite"] = allowIframeAuth
    ? "none"
    : "lax";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    maxAge,
    path: "/",
  };
}

export function getAccessTokenCookieOptions(): AuthCookieOptions {
  return buildCookieOptions(ACCESS_TOKEN_MAX_AGE);
}

export function getRefreshTokenCookieOptions(): AuthCookieOptions {
  return buildCookieOptions(REFRESH_TOKEN_MAX_AGE);
}
