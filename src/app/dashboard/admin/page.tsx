import { redirect } from "next/navigation";

/**
 * Admin dashboard - redirects to unified moderator dashboard
 * Admins now use the same dashboard as moderators with additional privileges
 */
export default function AdminDashboardPage() {
  // Redirect all admins to the unified moderator dashboard
  redirect("/dashboard/moderator");
}
