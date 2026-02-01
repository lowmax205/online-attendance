import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/server";
import { UserManagementClient } from "@/app/dashboard/admin/users/user-management-client";

export default async function UserManagementPage() {
  // Server-side authentication and authorization
  const session = await requireAuth();

  // Check if user has permission (Administrator or Moderator)
  const hasPermission =
    session.role === "Administrator" || session.role === "Moderator";

  if (!hasPermission) {
    redirect("/dashboard");
  }

  const isReadOnly = session.role === "Moderator";

  return (
    <UserManagementClient isReadOnly={isReadOnly} userEmail={session.email} />
  );
}
