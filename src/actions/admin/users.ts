/**
 * Server actions for Admin User Management (FR-001 to FR-015)
 * Phase 3.3 - T014-T019
 */

"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/server";
import { randomUUID } from "crypto";
import {
  userListQuerySchema,
  userRoleUpdateSchema,
  userStatusUpdateSchema,
  userEmailUpdateSchema,
  userPasswordResetSchema,
  userCreateSchema,
  userDeleteSchema,
  type UserListQuery,
  type UserRoleUpdate,
  type UserStatusUpdate,
  type UserEmailUpdate,
  type UserCreate,
  type UserDelete,
} from "@/lib/validations/user-management";
import { Role, AccountStatus, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";

// Response types
interface ListUsersResponse {
  success: boolean;
  data?: {
    users: Array<{
      id: string;
      email: string;
      role: Role;
      accountStatus: AccountStatus;
      statusChangeReason: string | null;
      firstName: string;
      lastName: string;
      createdAt: Date;
      lastLoginAt: Date | null;
      suspendedAt: Date | null;
      suspendedBy: { email: string } | null;
      deletedAt: Date | null;
      profile?: {
        studentId: string;
        department: string;
        yearLevel: number;
        section: string | null;
      } | null;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    summary: {
      totalActive: number;
      totalSuspended: number;
      totalAdministrators: number;
      totalModerators: number;
    };
  };
  message?: string;
  error?: string;
}

interface UserActionResponse {
  success: boolean;
  data?: {
    user?: {
      id: string;
      email: string;
      role: Role;
      accountStatus: AccountStatus;
    };
    temporaryPassword?: string;
  };
  message?: string;
  error?: string;
  requiresConfirmation?: boolean;
}

/**
 * T014: List users with filtering, pagination, and sorting
 * Endpoint: GET /api/admin/users
 * Roles: ADMIN (full access), MODERATOR (read-only)
 */
export async function listUsers(
  query: Partial<UserListQuery>,
): Promise<ListUsersResponse> {
  try {
    // Verify authentication and authorization
    const user = await requireRole(["Administrator", "Moderator"]);
    const isAdministrator = user.role === "Administrator";

    // Validate and parse query parameters
    const validatedQuery = userListQuerySchema.parse(query);

    // Build base where clause (excluding status to support breakdown counts)
    const statusFilter = validatedQuery.status;
    const roleFilter = validatedQuery.role;

    const baseWhere: Prisma.UserWhereInput = {
      deletedAt: null, // Exclude soft-deleted users
    };

    if (roleFilter) {
      baseWhere.role = roleFilter;
    }

    if (validatedQuery.search) {
      baseWhere.OR = [
        { email: { contains: validatedQuery.search, mode: "insensitive" } },
        {
          firstName: { contains: validatedQuery.search, mode: "insensitive" },
        },
        { lastName: { contains: validatedQuery.search, mode: "insensitive" } },
      ];
    }

    const listWhere: Prisma.UserWhereInput = {
      ...baseWhere,
      ...(statusFilter ? { accountStatus: statusFilter } : {}),
    };

    // Count total matching records
    const total = await db.user.count({ where: listWhere });

    // Count breakdown totals respecting current filters
    const totalActivePromise =
      !statusFilter || statusFilter === AccountStatus.ACTIVE
        ? db.user.count({
            where: {
              ...baseWhere,
              accountStatus: AccountStatus.ACTIVE,
            },
          })
        : Promise.resolve(0);

    const totalSuspendedPromise =
      !statusFilter || statusFilter === AccountStatus.SUSPENDED
        ? db.user.count({
            where: {
              ...baseWhere,
              accountStatus: AccountStatus.SUSPENDED,
            },
          })
        : Promise.resolve(0);

    const totalAdministratorsPromise =
      !roleFilter || roleFilter === Role.Administrator
        ? db.user.count({
            where: {
              ...baseWhere,
              role: Role.Administrator,
              ...(statusFilter ? { accountStatus: statusFilter } : {}),
            },
          })
        : Promise.resolve(0);

    const totalModeratorsPromise =
      !roleFilter || roleFilter === Role.Moderator
        ? db.user.count({
            where: {
              ...baseWhere,
              role: Role.Moderator,
              ...(statusFilter ? { accountStatus: statusFilter } : {}),
            },
          })
        : Promise.resolve(0);

    const [totalActive, totalSuspended, totalAdministrators, totalModerators] =
      await Promise.all([
        totalActivePromise,
        totalSuspendedPromise,
        totalAdministratorsPromise,
        totalModeratorsPromise,
      ]);

    // Query users with pagination
    const users = await db.user.findMany({
      where: listWhere,
      select: {
        id: true,
        email: true,
        role: true,
        accountStatus: true,
        statusChangeReason: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        lastLoginAt: true,
        suspendedAt: true,
        User_User_suspendedByIdToUser: {
          select: { email: true },
        },
        deletedAt: true,
        UserProfile: {
          select: {
            studentId: true,
            department: true,
            yearLevel: true,
            section: true,
          },
        },
      },
      orderBy: {
        [validatedQuery.sortBy]: validatedQuery.sortOrder,
      },
      skip: (validatedQuery.page - 1) * validatedQuery.limit,
      take: validatedQuery.limit,
    });

    // Map profile for response
    const usersWithProfile = users.map((u) => ({
      ...u,
      suspendedBy: u.User_User_suspendedByIdToUser,
      profile: u.UserProfile,
    }));

    return {
      success: true,
      data: {
        users: usersWithProfile,
        pagination: {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          total,
          totalPages: Math.ceil(total / validatedQuery.limit),
        },
        summary: {
          totalActive,
          totalSuspended,
          totalAdministrators,
          totalModerators,
        },
      },
      // Provide hint to clients about capability level
      ...(isAdministrator
        ? {}
        : {
            message: "Limited access: moderator permissions are read-only",
          }),
    };
  } catch (error: unknown) {
    console.error("List users error:", error);
    return {
      success: false,
      error: (error as Error)?.message || "Failed to list users",
    };
  }
}

/**
 * T015: Update user role with self-change confirmation
 * Endpoint: PATCH /api/admin/users/:userId/role
 * Roles: ADMIN
 */
export async function updateUserRole(
  userId: string,
  data: UserRoleUpdate,
): Promise<UserActionResponse> {
  try {
    // Verify authentication and authorization
    const currentUser = await requireRole(["Administrator"]);
    if (!currentUser || currentUser.role !== "Administrator") {
      return {
        success: false,
        error: "Forbidden: Admin access required",
      };
    }

    // Validate input
    const validatedData = userRoleUpdateSchema.parse(data);

    // Check if target user exists
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    if (!targetUser) {
      return { success: false, error: "User not found" };
    }

    // Check if role is already set
    if (targetUser.role === validatedData.role) {
      return { success: false, error: "User already has this role" };
    }

    // Check self-role change confirmation (FR-008)
    if (userId === currentUser.userId && !validatedData.confirmSelfChange) {
      return {
        success: false,
        error: "Self-role change requires confirmation",
        requiresConfirmation: true,
      };
    }

    // Get headers for logging
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") || undefined;
    const userAgent = headersList.get("user-agent") || undefined;

    // Update user role
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { role: validatedData.role },
      select: { id: true, email: true, role: true, accountStatus: true },
    });

    // Log security event (FR-010)
    await db.securityLog.create({
      data: {
        id: randomUUID(),
        userId: currentUser.userId,
        eventType: "USER_ROLE_CHANGED",
        metadata: {
          fromRole: targetUser.role,
          toRole: validatedData.role,
          targetUserId: userId,
        },
        ipAddress,
        userAgent,
      },
    });

    return {
      success: true,
      data: { user: updatedUser },
      message: "User role updated successfully",
    };
  } catch (error: unknown) {
    console.error("Update user role error:", error);
    return {
      success: false,
      error: (error as Error)?.message || "Failed to update user role",
    };
  }
}

/**
 * T016: Update user account status (suspend/reactivate)
 * Endpoint: PATCH /api/admin/users/:userId/status
 * Roles: ADMIN
 */
export async function updateUserStatus(
  userId: string,
  data: UserStatusUpdate,
): Promise<UserActionResponse> {
  try {
    // Verify authentication and authorization
    const currentUser = await requireRole(["Administrator"]);
    if (!currentUser || currentUser.role !== "Administrator") {
      return {
        success: false,
        error: "Forbidden: Admin access required",
      };
    }

    // Validate input
    const validatedData = userStatusUpdateSchema.parse(data);

    // Prevent self-suspension
    if (userId === currentUser.userId) {
      return {
        success: false,
        error: "You cannot change your own account status",
      };
    }

    // Check if target user exists
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, accountStatus: true },
    });

    if (!targetUser) {
      return { success: false, error: "User not found" };
    }

    // Get headers for logging
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") || undefined;
    const userAgent = headersList.get("user-agent") || undefined;

    // Prepare update data
    const updateData: Prisma.UserUpdateInput = {
      accountStatus: validatedData.accountStatus,
      statusChangeReason: validatedData.reason || null,
    };

    if (validatedData.accountStatus === AccountStatus.SUSPENDED) {
      updateData.suspendedAt = new Date();
      updateData.User_User_suspendedByIdToUser = {
        connect: { id: currentUser.userId },
      };
    } else {
      // Clear suspension fields if reactivating
      updateData.suspendedAt = null;
      updateData.User_User_suspendedByIdToUser = { disconnect: true };
    }

    // Update user status
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, email: true, role: true, accountStatus: true },
    });

    // Log security event (FR-010)
    await db.securityLog.create({
      data: {
        id: randomUUID(),
        userId: currentUser.userId,
        eventType: "USER_STATUS_CHANGED",
        metadata: {
          fromStatus: targetUser.accountStatus,
          toStatus: validatedData.accountStatus,
          targetUserId: userId,
          reason: validatedData.reason,
        },
        ipAddress,
        userAgent,
      },
    });

    return {
      success: true,
      data: { user: updatedUser },
      message: `User ${validatedData.accountStatus === AccountStatus.SUSPENDED ? "suspended" : "reactivated"} successfully`,
    };
  } catch (error: unknown) {
    console.error("Update user status error:", error);
    return {
      success: false,
      error: (error as Error)?.message || "Failed to update user status",
    };
  }
}

/**
 * Update user email
 * Endpoint: PATCH /api/admin/users/:userId/email
 * Roles: ADMIN
 */
export async function updateUserEmail(
  userId: string,
  data: UserEmailUpdate,
): Promise<UserActionResponse> {
  try {
    // Verify authentication and authorization
    const currentUser = await requireRole(["Administrator"]);
    if (!currentUser || currentUser.role !== "Administrator") {
      return {
        success: false,
        error: "Forbidden: Admin access required",
      };
    }

    // Validate input
    const validatedData = userEmailUpdateSchema.parse(data);

    // Check if target user exists
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!targetUser) {
      return { success: false, error: "User not found" };
    }

    // Check if new email is already in use by another user
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email },
      select: { id: true },
    });

    if (existingUser && existingUser.id !== userId) {
      return {
        success: false,
        error: "Email address is already in use by another user",
      };
    }

    // If email is the same, no update needed
    if (targetUser.email === validatedData.email) {
      return {
        success: false,
        error: "New email is the same as the current email",
      };
    }

    // Get headers for logging
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") || undefined;
    const userAgent = headersList.get("user-agent") || undefined;

    // Update user email
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        email: validatedData.email,
      },
      select: { id: true, email: true, role: true, accountStatus: true },
    });

    // Log security event
    await db.securityLog.create({
      data: {
        id: randomUUID(),
        userId: currentUser.userId,
        eventType: "USER_STATUS_CHANGED",
        metadata: {
          changeType: "EMAIL_UPDATED",
          fromEmail: targetUser.email,
          toEmail: validatedData.email,
          targetUserId: userId,
          reason: validatedData.reason,
        },
        ipAddress,
        userAgent,
      },
    });

    return {
      success: true,
      data: { user: updatedUser },
      message: "User email updated successfully",
    };
  } catch (error: unknown) {
    console.error("Update user email error:", error);
    return {
      success: false,
      error: (error as Error)?.message || "Failed to update user email",
    };
  }
}

/**
 * Generate a 6-character alphabetic temporary password
 */
function generateAlphabeticPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // Removed I and O to avoid confusion
  let password = "";
  for (let i = 0; i < 6; i++) {
    password += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return password;
}

/**
 * T017: Reset user password
 * Endpoint: POST /api/admin/users/:userId/reset-password
 * Roles: ADMIN
 */
export async function resetUserPassword(
  userId: string,
): Promise<UserActionResponse> {
  try {
    // Verify authentication and authorization
    const currentUser = await requireRole(["Administrator"]);
    if (!currentUser || currentUser.role !== "Administrator") {
      return {
        success: false,
        error: "Forbidden: Admin access required",
      };
    }

    // Validate userId
    userPasswordResetSchema.parse({ userId });

    // Check if target user exists
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        accountStatus: true,
      },
    });

    if (!targetUser) {
      return { success: false, error: "User not found" };
    }

    // Don't reset password for suspended accounts
    if (targetUser.accountStatus === AccountStatus.SUSPENDED) {
      return {
        success: false,
        error: "Cannot reset password for suspended accounts",
      };
    }

    // Generate 6-character alphabetic temporary password
    const temporaryPassword = generateAlphabeticPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    // Get headers for logging
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") || undefined;
    const userAgent = headersList.get("user-agent") || undefined;

    // Update user with temporary password
    await db.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        temporaryPassword: passwordHash, // Store hash for comparison
        temporaryPasswordUsageCount: 0,
        temporaryPasswordCreatedAt: new Date(),
        passwordResetAt: new Date(),
        passwordResetById: currentUser.userId,
      },
    });

    // Log security event (FR-010)
    await db.securityLog.create({
      data: {
        id: randomUUID(),
        userId: currentUser.userId,
        eventType: "USER_PASSWORD_RESET",
        metadata: {
          targetUserId: userId,
          targetEmail: targetUser.email,
        },
        ipAddress,
        userAgent,
      },
    });

    return {
      success: true,
      data: { temporaryPassword },
      message:
        "Password reset successfully. Provide this temporary password to the user (displayed once)",
    };
  } catch (error: unknown) {
    console.error("Reset user password error:", error);
    return {
      success: false,
      error: (error as Error)?.message || "Failed to reset user password",
    };
  }
}

/**
 * T018: Create new user
 * Endpoint: POST /api/admin/users
 * Roles: ADMIN
 */
export async function createUser(
  data: UserCreate,
): Promise<UserActionResponse> {
  try {
    // Verify authentication and authorization
    const currentUser = await requireRole(["Administrator"]);
    if (!currentUser || currentUser.role !== "Administrator") {
      return {
        success: false,
        error: "Forbidden: Admin access required",
      };
    }

    // Validate input
    const validatedData = userCreateSchema.parse(data);

    // Check email uniqueness
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return { success: false, error: "Email already in use" };
    }

    // Generate temporary password
    const temporaryPassword = `Welcome${Math.random().toString(36).slice(2, 10)}@${Date.now().toString().slice(-4)}`;
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    // Get headers for logging
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") || undefined;
    const userAgent = headersList.get("user-agent") || undefined;

    // Create user with profile if student
    const newUser = await db.user.create({
      data: {
        id: randomUUID(),
        email: validatedData.email,
        passwordHash,
        role: validatedData.role,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        accountStatus: AccountStatus.ACTIVE,
        emailVerified: false,
        ...(validatedData.role === Role.Student &&
          validatedData.studentNumber &&
          validatedData.department && {
            UserProfile: {
              create: {
                id: randomUUID(),
                studentId: validatedData.studentNumber,
                department: validatedData.department,
                course: validatedData.course || undefined,
                campus: validatedData.campus || undefined,
                yearLevel: validatedData.yearLevel || 1,
                section: validatedData.section || undefined,
                updatedAt: new Date(),
              },
            },
          }),
      },
      select: { id: true, email: true, role: true, accountStatus: true },
    });

    // Log security event (FR-010)
    await db.securityLog.create({
      data: {
        id: randomUUID(),
        userId: currentUser.userId,
        eventType: "USER_CREATED",
        metadata: {
          newUserId: newUser.id,
          role: validatedData.role,
          email: validatedData.email,
        },
        ipAddress,
        userAgent,
      },
    });

    return {
      success: true,
      data: {
        user: newUser,
        temporaryPassword,
      },
      message:
        "User created successfully. Provide the temporary password to the user (displayed once)",
    };
  } catch (error: unknown) {
    console.error("Create user error:", error);
    return {
      success: false,
      error: (error as Error)?.message || "Failed to create user",
    };
  }
}

/**
 * T019: Soft delete user
 * Endpoint: DELETE /api/admin/users/:userId
 * Roles: ADMIN
 */
export async function deleteUser(
  data: UserDelete,
): Promise<UserActionResponse> {
  try {
    // Verify authentication and authorization
    const currentUser = await requireRole(["Administrator"]);
    if (!currentUser || currentUser.role !== "Administrator") {
      return {
        success: false,
        error: "Forbidden: Admin access required",
      };
    }

    // Validate input
    const validatedData = userDeleteSchema.parse(data);

    // Prevent self-deletion
    if (validatedData.userId === currentUser.userId) {
      return {
        success: false,
        error: "You cannot delete your own account",
      };
    }

    // Check if target user exists and not already deleted
    const targetUser = await db.user.findFirst({
      where: {
        id: validatedData.userId,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        _count: {
          select: { Attendance_Attendance_userIdToUser: true },
        },
      },
    });

    if (!targetUser) {
      return { success: false, error: "User not found or already deleted" };
    }

    // Get headers for logging
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") || undefined;
    const userAgent = headersList.get("user-agent") || undefined;

    // Soft delete user
    await db.user.update({
      where: { id: validatedData.userId },
      data: {
        deletedAt: new Date(),
        deletedById: currentUser.userId,
        accountStatus: AccountStatus.SUSPENDED, // Also suspend on deletion
      },
    });

    // Log security event (FR-010)
    await db.securityLog.create({
      data: {
        id: randomUUID(),
        userId: currentUser.userId,
        eventType: "USER_DELETED",
        metadata: {
          targetUserId: validatedData.userId,
          targetEmail: targetUser.email,
          reason: validatedData.reason,
          hadAttendances:
            targetUser._count.Attendance_Attendance_userIdToUser > 0,
        },
        ipAddress,
        userAgent,
      },
    });

    return {
      success: true,
      message: "User deleted successfully",
    };
  } catch (error: unknown) {
    console.error("Delete user error:", error);
    return {
      success: false,
      error: (error as Error)?.message || "Failed to delete user",
    };
  }
}
