"use server";

import { db } from "@/lib/db";
import { SecurityEventType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

/**
 * T060: Security Logging Helper
 * Phase 3.13 - Middleware & Security
 *
 * Provides a consistent interface for creating SecurityLog entries
 * across all management actions and security-sensitive operations.
 */

export interface SecurityLogEvent {
  eventType: SecurityEventType;
  userId: string;
  success: boolean;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log a security event to the SecurityLog table
 *
 * @param event - Security event details
 * @returns Promise that resolves when the log is created
 *
 * @example
 * await logSecurityEvent({
 *   eventType: "USER_UPDATED",
 *   userId: user.userId,
 *   success: true,
 *   metadata: { targetUserId: "abc123", changes: ["accountStatus"] },
 *   ipAddress: "192.168.1.1",
 *   userAgent: "Mozilla/5.0...",
 * });
 */
export async function logSecurityEvent(event: SecurityLogEvent): Promise<void> {
  try {
    await db.securityLog.create({
      data: {
        id: randomUUID(),
        userId: event.userId,
        eventType: event.eventType,
        success: event.success,
        metadata: event.metadata || {},
        ipAddress: event.ipAddress || "unknown",
        userAgent: event.userAgent || "unknown",
      },
    });
  } catch (error) {
    // Log to console but don't throw - security logging shouldn't break the main flow
    console.error("Failed to create security log:", error);
  }
}

/**
 * Log multiple security events in a batch
 *
 * @param events - Array of security events
 * @returns Promise that resolves when all logs are created
 */
export async function logSecurityEvents(
  events: SecurityLogEvent[],
): Promise<void> {
  try {
    await db.securityLog.createMany({
      data: events.map((event) => ({
        id: randomUUID(),
        userId: event.userId,
        eventType: event.eventType,
        success: event.success,
        metadata: event.metadata || {},
        ipAddress: event.ipAddress || "unknown",
        userAgent: event.userAgent || "unknown",
      })),
    });
  } catch (error) {
    console.error("Failed to create security logs:", error);
  }
}
