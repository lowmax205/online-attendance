import { SecurityEventType } from "@prisma/client";

/**
 * User-related TypeScript types
 * Used for user profiles, sessions, and user data management
 */

/**
 * User session data (stored in context/cookies)
 */
export interface UserSession {
  userId: string;
  email: string;
  role: "Student" | "Moderator" | "Administrator";
  firstName: string;
  lastName: string;
  hasProfile: boolean;
  profilePictureUrl?: string | null;
  sessionId?: string;
}

/**
 * Complete user profile data
 */
export interface UserProfile {
  id: string;
  userId: string;
  studentId: string;
  department: string;
  yearLevel: number;
  section?: string | null;
  contactNumber?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User profile creation/update data
 */
export interface ProfileData {
  studentId: string;
  department: string;
  yearLevel: number;
  section?: string;
  contactNumber?: string;
}

/**
 * Complete user data with profile (for admin views)
 */
export interface UserWithProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "Student" | "Moderator" | "Administrator";
  emailVerified: boolean;
  createdAt: Date;
  profile?: UserProfile | null;
}

/**
 * Security log entry
 */
export interface SecurityLogEntry {
  id: string;
  userId: string;
  action: SecurityEventType;
  ipAddress?: string | null;
  userAgent?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any> | null;
  createdAt: Date;
}
