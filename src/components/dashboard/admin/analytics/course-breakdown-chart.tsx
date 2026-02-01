"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * T055: CourseBreakdownChart Component
 * Phase 3.12 - UI Components - Analytics Dashboard
 * T057.1: Enhanced with drill-down navigation
 *
 * Displays attendance count by course using Recharts BarChart
 * Click on bars to view attendance records for that course
 */

interface CourseData {
  course: string;
  count: number;
}

interface CourseBreakdownChartProps {
  data: CourseData[];
  isLoading?: boolean;
  dateRange?: { startDate?: string; endDate?: string };
}

export function CourseBreakdownChart({
  data,
  isLoading,
  dateRange,
}: CourseBreakdownChartProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attendance by Course</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  // Sort descending by count
  const sortedData = [...data].sort((a, b) => b.count - a.count);

  // Handle click on bar to drill down by course
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const clickedCourse = data.activePayload[0].payload.course;
      const params = new URLSearchParams({
        course: clickedCourse,
        status: "APPROVED",
      });

      // Add date range from analytics filter
      if (dateRange?.startDate) {
        params.set("startDate", dateRange.startDate);
      }
      if (dateRange?.endDate) {
        params.set("endDate", dateRange.endDate);
      }

      router.push(`/dashboard/admin/attendance?${params.toString()}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance by Course</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={sortedData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            aria-label="Course breakdown bar chart"
            onClick={handleClick}
            style={{ cursor: "pointer" }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="course"
              angle={-45}
              textAnchor="end"
              height={90}
              className="text-xs"
              tick={{ fill: "currentColor" }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: "currentColor" }}
              label={{
                value: "Attendance Count",
                angle: -90,
                position: "insideLeft",
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend wrapperStyle={{ paddingTop: "10px" }} />
            <Bar
              dataKey="count"
              fill="hsl(var(--chart-2))"
              name="Attendances"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
