import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";

interface StudentDashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Student dashboard layout
 * Authentication check only - navigation is handled by root layout
 */
export default async function StudentDashboardLayout({
  children,
}: StudentDashboardLayoutProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?redirect=/dashboard/student");
  }

  if (user.role !== "Student") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
