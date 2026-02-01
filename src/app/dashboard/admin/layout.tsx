import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";

/**
 * Admin dashboard layout
 * Authentication check only - navigation is handled by root layout
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?redirect=/dashboard/admin");
  }

  if (user.role !== "Administrator" && user.role !== "Moderator") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
