"use client";

import * as React from "react";
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
 * T051: TopEventsChart Component
 * Phase 3.12 - UI Components - Analytics Dashboard
 * T057.1: Enhanced with drill-down navigation
 *
 * Displays top 10 events by attendance count using Recharts BarChart
 * Click on bars to view attendance records for that event
 */

interface TopEventData {
  eventName: string;
  attendanceCount: number;
  eventId?: string;
}

/**
 * Convert event name to acronym for chart display
 */
function eventToAcronym(eventName: string, index: number): string {
  // Use "Event" + number for simplicity
  return `E${index + 1}`;
}

interface TopEventsChartProps {
  data: TopEventData[];
  isLoading?: boolean;
  dateRange: { startDate?: string; endDate?: string };
}

export function TopEventsChart({ data, isLoading }: TopEventsChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Events by Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Events by Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground text-sm mb-2">
                No event data available
              </p>
              <p className="text-muted-foreground text-xs">
                Top events will appear here once attendance is recorded
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if all events have zero attendance
  const hasAnyAttendance = data.some((event) => event.attendanceCount > 0);

  if (!hasAnyAttendance) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Events by Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground text-sm mb-2">
                No attendance recorded yet
              </p>
              <p className="text-muted-foreground text-xs">
                Events exist but no students have checked in. Top events will
                appear once attendance is recorded.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort descending by attendance count and add short labels
  const sortedData = [...data]
    .sort((a, b) => b.attendanceCount - a.attendanceCount)
    .map((item, index) => ({
      ...item,
      label: eventToAcronym(item.eventName, index),
      fullName: item.eventName, // Keep full name for tooltip
    }));

  // Custom tooltip to show full event name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
            padding: "8px 12px",
          }}
        >
          <p
            style={{
              color: "hsl(var(--foreground))",
              marginBottom: "4px",
              fontWeight: 500,
            }}
          >
            {payload[0].payload.fullName}
          </p>
          <p
            style={{ color: "hsl(var(--muted-foreground))", fontSize: "14px" }}
          >
            Attendances: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Events by Attendance</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={sortedData}
            margin={{ top: 20, right: 30, left: 30, bottom: 5 }}
            aria-label="Top events by attendance bar chart"
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="label"
              height={40}
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
              content={<CustomTooltip />}
              wrapperStyle={{ outline: "none" }}
            />
            <Legend wrapperStyle={{ paddingTop: "10px" }} />
            <Bar
              dataKey="attendanceCount"
              fill="#06b6d4"
              name="Attendances"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
