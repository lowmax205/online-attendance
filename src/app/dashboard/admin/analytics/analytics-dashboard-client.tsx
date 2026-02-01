"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MetricsSummary } from "@/components/dashboard/admin/analytics/metrics-summary";
import { AttendanceTrendsChart } from "@/components/dashboard/admin/analytics/attendance-trends-chart";
import { TopEventsChart } from "@/components/dashboard/admin/analytics/top-events-chart";
import { EventStatusChart } from "@/components/dashboard/admin/analytics/event-status-chart";
import { VerificationStatusChart } from "@/components/dashboard/admin/analytics/verification-status-chart";
import { DepartmentBreakdownChart } from "@/components/dashboard/admin/analytics/department-breakdown-chart";
import { AttendanceGeolocationMap } from "@/components/dashboard/admin/analytics/attendance-geolocation-map";
import { TimePeriodFilter } from "@/components/dashboard/admin/analytics/time-period-filter";
import { getAnalyticsDashboard } from "@/actions/dashboard/admin";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";
import { DateRange } from "react-day-picker";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnalyticsData = any;

interface AnalyticsDashboardClientProps {
  isReadOnly: boolean;
}

export function AnalyticsDashboardClient({
  isReadOnly,
}: AnalyticsDashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [analyticsData, setAnalyticsData] =
    React.useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Initialize filter from URL params or default to 30 days
  const [filter, setFilter] = React.useState({
    preset: searchParams.get("preset") || "30days",
    customRange: undefined as DateRange | undefined,
  });

  // Calculate date range based on preset or custom range
  const getDateRange = React.useCallback(() => {
    if (filter.preset === "custom" && filter.customRange) {
      return {
        startDate: filter.customRange.from?.toISOString(),
        endDate: filter.customRange.to?.toISOString(),
      };
    }

    const endDate = new Date();
    const startDate = new Date();

    switch (filter.preset) {
      case "7days":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "30days":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "90days":
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }, [filter]);

  // Fetch analytics data
  const fetchAnalytics = React.useCallback(
    async (refresh = false) => {
      try {
        setIsLoading(true);
        const dateRange = getDateRange();

        const result = await getAnalyticsDashboard({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          refresh,
        });

        if (!result.success || !result.data) {
          throw new Error(result.error || "Failed to fetch analytics");
        }

        setAnalyticsData(result.data);
      } catch (error) {
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to load analytics",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [getDateRange, toast],
  );

  // Initial fetch
  React.useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleFilterChange = (newFilter: {
    preset: string;
    customRange?: DateRange;
  }) => {
    setFilter({
      preset: newFilter.preset,
      customRange: newFilter.customRange,
    });
    // Update URL after state change
    setTimeout(() => {
      const params = new URLSearchParams();
      params.set("preset", newFilter.preset);
      if (newFilter.preset === "custom" && newFilter.customRange) {
        if (newFilter.customRange.from) {
          params.set(
            "startDate",
            format(newFilter.customRange.from, "yyyy-MM-dd"),
          );
        }
        if (newFilter.customRange.to) {
          params.set("endDate", format(newFilter.customRange.to, "yyyy-MM-dd"));
        }
      }
      router.replace(`/dashboard/admin/analytics?${params.toString()}`);
    }, 0);
  };

  const handleRefresh = () => {
    fetchAnalytics(true);
  };

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      {isReadOnly && (
        <Alert className="border-border/60 mb-8">
          <ShieldAlert className="mt-0.5 h-4 w-4 text-muted-foreground" />
          <AlertTitle>View-only access</AlertTitle>
          <AlertDescription>
            Moderator accounts can explore analytics but cannot adjust data
            sources or configuration. Contact an administrator for elevated
            access.
          </AlertDescription>
        </Alert>
      )}
      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between mb-8">
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            Analytics Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Comprehensive analytics and insights for events and attendance
          </p>
        </div>
      </div>

      {/* Time Period Filter */}
      <div className="mb-8">
        <TimePeriodFilter
          value={filter}
          onChange={handleFilterChange}
          onRefresh={handleRefresh}
          isLoading={isLoading}
          metadata={analyticsData?.metadata}
        />
      </div>

      {/* Key Metrics */}
      <div className="mb-8">
        <MetricsSummary
          metrics={
            analyticsData?.keyMetrics || {
              totalEvents: 0,
              totalAttendances: 0,
              verificationRate: 0,
              pendingCount: 0,
            }
          }
          isLoading={isLoading}
          dateRange={getDateRange()}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Attendance Trends - Full Width */}
        <div className="lg:col-span-2">
          <AttendanceTrendsChart
            data={analyticsData?.charts?.attendanceTrends?.data || []}
            isLoading={isLoading}
            dateRange={getDateRange()}
          />
        </div>

        {/* Top Events */}
        <TopEventsChart
          data={analyticsData?.charts?.topEvents?.data || []}
          isLoading={isLoading}
          dateRange={getDateRange()}
        />

        {/* Event Status Distribution */}
        <EventStatusChart
          data={analyticsData?.charts?.eventStatusDistribution?.data || []}
          isLoading={isLoading}
        />

        {/* Verification Status Distribution */}
        <VerificationStatusChart
          data={
            analyticsData?.charts?.verificationStatusDistribution?.data || []
          }
          isLoading={isLoading}
          dateRange={getDateRange()}
        />

        {/* Department/Colleges Breakdown */}
        <DepartmentBreakdownChart
          data={analyticsData?.charts?.departmentBreakdown?.data || []}
          isLoading={isLoading}
        />

        {/* Attendance Geolocation Map */}
        <AttendanceGeolocationMap
          data={analyticsData?.charts?.geolocationMap?.data || []}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

// Simple implementation for yyyy-MM-dd format
function format(date: Date, formatString: string): string {
  if (formatString === "yyyy-MM-dd") {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return date.toISOString();
}
