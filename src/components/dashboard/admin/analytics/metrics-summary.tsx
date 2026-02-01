"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle2, TrendingUp, AlertCircle } from "lucide-react";

/**
 * T049: MetricsSummary Component
 * Phase 3.12 - UI Components - Analytics Dashboard
 *
 * Displays 4 key metric cards:
 * - Total Events
 * - Total Attendances
 * - Verification Rate
 * - Pending Count
 */

interface KeyMetrics {
  totalEvents: number;
  totalAttendances: number;
  verificationRate: number;
  pendingCount: number;
}

interface MetricsSummaryProps {
  metrics: KeyMetrics;
  isLoading?: boolean;
  dateRange: { startDate?: string; endDate?: string };
}

export function MetricsSummary({
  metrics,
  isLoading,
  dateRange,
}: MetricsSummaryProps) {
  const metricCards = [
    {
      title: "Total Events",
      value: metrics.totalEvents,
      icon: Calendar,
      description: "Events created",
      filterLink: "/dashboard/admin/events",
    },
    {
      title: "Total Attendances",
      value: metrics.totalAttendances,
      icon: CheckCircle2,
      description: "Attendance submissions",
      filterLink: `/dashboard/admin/attendance${dateRange?.startDate ? `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}` : ""}`,
    },
    {
      title: "Verification Rate",
      value: `${metrics.verificationRate.toFixed(1)}%`,
      icon: TrendingUp,
      description: "Approved attendances",
      filterLink: `/dashboard/admin/attendance?status=APPROVED${dateRange?.startDate ? `&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}` : ""}`,
    },
    {
      title: "Pending Verifications",
      value: metrics.pendingCount,
      icon: AlertCircle,
      description: "Awaiting review",
      filterLink: `/dashboard/admin/attendance?status=PENDING${dateRange?.startDate ? `&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}` : ""}`,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-8 w-8 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 animate-pulse rounded bg-muted mb-1" />
              <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metricCards.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
