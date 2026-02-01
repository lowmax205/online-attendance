"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/server";
import { logAction } from "@/lib/security/audit-log";
import { headers } from "next/headers";
import { z } from "zod";
import { randomUUID } from "crypto";

const updateConfigSchema = z.object({
  defaultGpsRadiusMeters: z
    .number()
    .int()
    .min(10, "GPS radius must be at least 10 meters")
    .max(500, "GPS radius must not exceed 500 meters")
    .optional(),
  defaultCheckInBufferMins: z
    .number()
    .int()
    .min(0, "Check-in buffer must be at least 0 minutes")
    .max(120, "Check-in buffer must not exceed 120 minutes")
    .optional(),
  defaultCheckOutBufferMins: z
    .number()
    .int()
    .min(0, "Check-out buffer must be at least 0 minutes")
    .max(120, "Check-out buffer must not exceed 120 minutes")
    .optional(),
});

/**
 * Get the current system configuration
 * Creates default config if none exists
 */
export async function getSystemConfig() {
  try {
    // Require Administrator role
    await requireRole(["Administrator"]);

    // Try to fetch existing config
    let config = await db.systemConfig.findFirst();

    // If no config exists, create default one
    if (!config) {
      // Get first admin user to set as updater
      const adminUser = await db.user.findFirst({
        where: { role: "Administrator" },
      });

      if (!adminUser) {
        return {
          success: false,
          error: "No administrator user found to initialize system config",
        };
      }

      config = await db.systemConfig.create({
        data: {
          id: randomUUID(),
          defaultGpsRadiusMeters: 100,
          defaultCheckInBufferMins: 30,
          defaultCheckOutBufferMins: 30,
          updatedById: adminUser.id,
          updatedAt: new Date(),
        },
      });
    }

    return {
      success: true,
      data: config,
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: "Failed to fetch system configuration",
    };
  }
}

/**
 * Update system configuration
 * Validates GPS radius (10-500m) and buffer times (0-120min)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateSystemConfig(input: any) {
  try {
    // Require Administrator role
    const user = await requireRole(["Administrator"]);

    // Validate input
    const validatedData = updateConfigSchema.parse(input);

    // Check if any valid field is provided
    if (
      !validatedData.defaultGpsRadiusMeters &&
      !validatedData.defaultCheckInBufferMins &&
      !validatedData.defaultCheckOutBufferMins
    ) {
      return {
        success: false,
        error: "At least one configuration field must be provided",
      };
    }

    // Get existing config (or create if doesn't exist)
    const existingConfig = await getSystemConfig();
    if (!existingConfig.success || !existingConfig.data) {
      return {
        success: false,
        error: "Failed to load existing configuration",
      };
    }

    // Update the configuration
    const updatedConfig = await db.systemConfig.update({
      where: { id: existingConfig.data.id },
      data: {
        ...validatedData,
        updatedById: user.userId,
      },
    });

    // Log security action
    const headersList = await headers();
    await logAction(
      "ANALYTICS_ACCESSED",
      user.userId,
      "SystemConfig",
      updatedConfig.id,
      {
        changes: validatedData,
      },
      headersList.get("x-forwarded-for") ||
        headersList.get("x-real-ip") ||
        undefined,
      headersList.get("user-agent") || undefined,
    );

    return {
      success: true,
      data: updatedConfig,
      message: "System configuration updated successfully",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Validation failed",
        details: error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: "Failed to update system configuration",
    };
  }
}
