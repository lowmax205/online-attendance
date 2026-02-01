import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";

/**
 * Dashboard redirect page
 * Redirects users to their role-specific dashboard
 */
export default async function DashboardPage() {
  // Get current user
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?redirect=/dashboard");
  }

  // Redirect based on role
  switch (user.role) {
    case "Student":
      redirect("/dashboard/student");
    case "Moderator":
      redirect("/dashboard/moderator");
    case "Administrator":
      redirect("/dashboard/admin");
    default:
      redirect("/auth/login");
  }
}
