import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { getStudentDashboard } from "@/actions/dashboard/student";
import { StudentDashboard } from "@/components/dashboard/student-dashboard";
import { TempPasswordWarning } from "@/components/dashboard/temp-password-warning";

/**
 * Student dashboard page
 * Displays attendance history, upcoming events, and stats
 */
export default async function StudentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; expanded?: string }>;
}) {
  // Check authentication and role
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?redirect=/dashboard/student");
  }

  if (user.role !== "Student") {
    redirect("/dashboard");
  }

  // Get search params
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const isExpanded = params.expanded === "true";
  const limit = isExpanded ? 10 : 5;

  // Fetch dashboard data
  const result = await getStudentDashboard({
    page,
    limit,
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

  const { attendanceHistory, upcomingEvents, stats, pagination } = result.data;

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Student Dashboard</h1>
        <p className="text-lg text-muted-foreground">
          Welcome back! Track your attendance and upcoming events.
        </p>
      </div>

      <TempPasswordWarning />

      <StudentDashboard
        stats={{
          totalAttendances: stats.totalAttendance,
          approvedAttendances: stats.approvedCount,
          pendingAttendances: stats.pendingCount,
          upcomingEvents: upcomingEvents.length,
        }}
        attendanceHistory={attendanceHistory.map((item) => ({
          id: item.id,
          eventName: item.eventName,
          checkInSubmittedAt: item.checkInSubmittedAt
            ? new Date(item.checkInSubmittedAt)
            : null,
          checkOutSubmittedAt: item.checkOutSubmittedAt
            ? new Date(item.checkOutSubmittedAt)
            : null,
          verificationStatus: item.verificationStatus as
            | "Pending"
            | "Approved"
            | "Rejected",
        }))}
        upcomingEvents={upcomingEvents.map((event) => ({
          id: event.id,
          name: event.name,
          startDateTime: new Date(event.startDateTime),
          venueName: event.venueName,
        }))}
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        isExpanded={isExpanded}
      />
    </div>
  );
}
