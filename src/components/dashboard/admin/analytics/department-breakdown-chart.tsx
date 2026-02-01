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
 * T054: DepartmentBreakdownChart Component
 * Phase 3.12 - UI Components - Analytics Dashboard
 * T057.1: Enhanced with drill-down navigation
 *
 * Displays attendance count by department using Recharts BarChart
 * Click on bars to view attendance records for that department
 */

interface DepartmentData {
  department: string;
  count: number;
}

interface DepartmentBreakdownChartProps {
  data: DepartmentData[];
  isLoading?: boolean;
}

export function DepartmentBreakdownChart({
  data,
  isLoading,
}: DepartmentBreakdownChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attendance by Department/Colleges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  // Hide card when there's only one department or no data
  if (!data || data.length === 0 || data.length === 1) {
    return null;
  }

  // Sort descending by count
  const sortedData = [...data].sort((a, b) => b.count - a.count);

  // Custom tooltip to show full department name
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
            {payload[0].payload.department}
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
        <CardTitle>Attendance by Department/Colleges</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={sortedData}
            margin={{ top: 20, right: 30, left: 30, bottom: 5 }}
            aria-label="Department/Colleges breakdown bar chart"
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="department"
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
              dataKey="count"
              fill="#facc15"
              name="Attendances"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
