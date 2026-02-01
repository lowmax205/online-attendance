/**
 * Authentication-related TypeScript types
 * Used for login, registration, and token management
 */

/**
 * Login credentials submitted by user
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration data submitted by user
 */
export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

/**
 * Authentication response returned from server actions
 */
export interface AuthResponse {
  success: boolean;
  message: string;
  user?: UserBasicInfo;
  requiresProfile?: boolean;
  warning?: string;
}

/**
 * Basic user information (safe for client-side)
 */
export interface UserBasicInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "Student" | "Moderator" | "Administrator";
  hasProfile: boolean;
  profilePictureUrl?: string | null;
}

/**
 * Token refresh response
 */
export interface TokenRefreshResponse {
  success: boolean;
  accessToken?: string;
}

/**
 * Rate limit error details
 */
export interface RateLimitError {
  error: "RATE_LIMIT_EXCEEDED";
  message: string;
  remaining: number;
  resetAt: Date;
}
