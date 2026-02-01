"use client";

import * as React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * T050: AttendanceTrendsChart Component
 * Phase 3.12 - UI Components - Analytics Dashboard
 * T057.1: Enhanced with drill-down navigation
 *
 * Displays attendance count over time using Recharts LineChart
 * Click on data points to view detailed attendance records for that date
 */

interface TrendData {
  date: string;
  count: number;
  originalDate?: string; // Store original date for filtering
  events?: string[]; // Event names for this date
}

interface AttendanceTrendsChartProps {
  data: TrendData[];
  isLoading?: boolean;
  dateRange: { startDate?: string; endDate?: string };
}

export function AttendanceTrendsChart({
  data,
  isLoading,
}: AttendanceTrendsChartProps) {
  // Custom tooltip to display event names
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: TrendData }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          className="rounded-lg border bg-background p-3 shadow-lg max-w-xs"
          style={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            color: "hsl(var(--foreground))",
          }}
        >
          <p className="font-semibold mb-2">{data.date}</p>
          <p className="text-sm">
            <span className="font-medium">Attendances:</span> {data.count}
          </p>
          {data.events && data.events.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-xs font-medium mb-1">Events:</p>
              <ul className="text-xs space-y-0.5 max-h-32 overflow-y-auto">
                {data.events.map((event: string, idx: number) => (
                  <li key={idx} className="text-muted-foreground">
                    • {event}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attendance Trends</CardTitle>
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
          <CardTitle>Attendance Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground text-sm mb-2">
                No attendance data available
              </p>
              <p className="text-muted-foreground text-xs">
                Attendance trends will appear here once events are created and
                students check in
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            aria-label="Attendance trends line chart"
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fill: "currentColor" }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: "currentColor" }}
              label={{
                value: "Attendances",
                angle: -90,
                position: "insideLeft",
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#ea580c"
              strokeWidth={3}
              name="Attendances"
              dot={{ fill: "#ea580c", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 8, fill: "#ea580c" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
