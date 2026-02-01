import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";

interface ModeratorDashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Moderator dashboard layout
 * Authentication check only - navigation is handled by root layout
 */
export default async function ModeratorDashboardLayout({
  children,
}: ModeratorDashboardLayoutProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?redirect=/dashboard/moderator");
  }

  if (user.role !== "Moderator" && user.role !== "Administrator") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
