import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/server";
import { AdminAttendanceManagementClient } from "@/app/dashboard/admin/attendance/attendance-management-client";

/**
 * src\app\dashboard\admin\attendance\attendance-management-client.tsx
 * Admin Attendance Management mirrors the user management layout, providing
 * global oversight of every attendance submission in the platform.
 */

export default async function AdminAttendanceManagementPage() {
  // Server-side authentication and authorization
  const session = await requireAuth();

  // Check if user has permission (Administrator or Moderator)
  const hasPermission =
    session.role === "Administrator" || session.role === "Moderator";

  if (!hasPermission) {
    redirect("/dashboard");
  }

  const isModerator = session.role === "Moderator";
  const isAdministrator = session.role === "Administrator";
  const canInitiateVerification = isAdministrator || isModerator;

  return (
    <AdminAttendanceManagementClient
      userId={session.userId}
      isModerator={isModerator}
      isAdministrator={isAdministrator}
      canInitiateVerification={canInitiateVerification}
    />
  );
}
