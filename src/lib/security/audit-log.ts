import { db } from "@/lib/db";
import { SecurityEventType } from "@prisma/client";
import { randomUUID } from "crypto";

/**
 * Log security-related actions to the SecurityLog table
 * Used for audit trail of event/attendance operations
 */
export async function logAction(
  eventType: SecurityEventType,
  userId: string,
  entityType: string,
  entityId: string,
  metadata?: object,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  try {
    await db.securityLog.create({
      data: {
        id: randomUUID(),
        eventType,
        userId,
        metadata: metadata
          ? JSON.parse(JSON.stringify({ entityType, entityId, ...metadata }))
          : { entityType, entityId },
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });
  } catch (error) {
    // Log to console but don't throw - audit logging failures shouldn't break user operations
    console.error("Failed to log security action:", error);
  }
}
