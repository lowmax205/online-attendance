import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/server";
import { AnalyticsDashboardClient } from "@/app/dashboard/admin/analytics/analytics-dashboard-client";

/**
 * T057: Admin Analytics Dashboard Page
 * Phase 3.12 - UI Components - Analytics Dashboard
 *
 * Features:
 * - Displays key metrics summary
 * - Shows multiple analytics charts (trends, top events, distributions)
 * - Date range filtering with presets
 * - Loading states and error handling
 * - Responsive grid layout
 */

export default async function AnalyticsDashboardPage() {
  // Server-side authentication and authorization
  const session = await requireAuth();

  // Check if user has permission (Administrator or Moderator)
  const hasPermission =
    session.role === "Administrator" || session.role === "Moderator";

  if (!hasPermission) {
    redirect("/dashboard");
  }

  const isReadOnly = session.role === "Moderator";

  return <AnalyticsDashboardClient isReadOnly={isReadOnly} />;
}
