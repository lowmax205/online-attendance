import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { getModeratorDashboard } from "@/actions/dashboard/moderator";
import { ModeratorDashboard } from "@/components/dashboard/moderator-dashboard";
import { TempPasswordWarning } from "@/components/dashboard/temp-password-warning";
/**
 * Moderator dashboard page
 * Displays events and stats
 */
export default async function ModeratorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    activityPage?: string;
    expanded?: string;
  }>;
}) {
  // Check authentication and role
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?redirect=/dashboard/moderator");
  }

  if (user.role !== "Moderator" && user.role !== "Administrator") {
    redirect("/dashboard");
  }

  // Get search params
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const limit = 5; // Always show only 5 events on dashboard
  const activityPage = parseInt(params.activityPage || "1", 10);
  const activityLimit = 10; // Default activity logs per page

  // Fetch dashboard data
  const result = await getModeratorDashboard({
    page,
    limit,
    activityPage,
    activityLimit,
  });

  if (!result.success || !result.data) {
    return (
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
          <h2 className="text-lg font-semibold text-destructive mb-2">
            Error Loading Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            {result.error || "Failed to load dashboard data"}
          </p>
        </div>
      </div>
    );
  }

  const {
    myEvents,
    recentActivity,
    stats,
    systemStats,
    userRole,
    activityPagination,
  } = result.data;

  // Type assertion: we know userRole is Moderator or Administrator because we checked above
  const dashboardRole = userRole as "Moderator" | "Administrator";

  // Determine dashboard title based on role
  const dashboardTitle =
    dashboardRole === "Administrator"
      ? "Admin Dashboard"
      : "Moderator Dashboard";
  const dashboardDescription =
    dashboardRole === "Administrator"
      ? "System overview and event management across all moderators."
      : "Manage events and verify attendance submissions.";

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{dashboardTitle}</h1>
        <p className="text-lg text-muted-foreground">{dashboardDescription}</p>
      </div>

      <TempPasswordWarning />

      <ModeratorDashboard
        userRole={dashboardRole}
        stats={{
          totalEvents: stats.totalEvents,
          activeEvents: stats.activeEvents,
          totalAttendances: stats.totalAttendance,
        }}
        systemStats={
          systemStats
            ? {
                totalUsers: systemStats.totalUsers,
              }
            : undefined
        }
        myEvents={myEvents.map((event) => ({
          id: event.id,
          name: event.name,
          startDateTime: new Date(event.startDateTime),
          status: event.status,
          attendanceCount: event.attendanceCount,
          creatorName: event.creatorName,
        }))}
        recentActivity={(recentActivity || []).map((activity) => ({
          id: activity.id,
          action: activity.action,
          timestamp: new Date(activity.timestamp),
          userName: activity.userName,
          userEmail: activity.userEmail,
          details: activity.details,
          success: activity.success,
        }))}
        activityPagination={activityPagination}
      />
    </div>
  );
}
