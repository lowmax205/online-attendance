"use client";

import * as React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * T053: VerificationStatusChart Component
 * Phase 3.12 - UI Components - Analytics Dashboard
 *
 * Displays verification status distribution using Recharts PieChart
 */

interface VerificationData {
  status: string;
  count: number;
}

interface VerificationStatusChartProps {
  data: VerificationData[];
  isLoading?: boolean;
  dateRange: { startDate?: string; endDate?: string };
}

// Two distinct colors for verification status
const STATUS_COLORS: Record<string, string> = {
  PENDING: "#facc15", // Yellow
  Pending: "#facc15", // Yellow
  pending: "#facc15", // Yellow
  APPROVED: "#10b981", // Green
  Approved: "#10b981", // Green
  approved: "#10b981", // Green
  REJECTED: "#f43f5e", // Rose/Pink
  Rejected: "#f43f5e",
  rejected: "#f43f5e",
};

// Helper function to get color for status
function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || "#6b7280"; // Gray fallback
}

export function VerificationStatusChart({
  data,
  isLoading,
}: VerificationStatusChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verification Status Distribution</CardTitle>
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
          <CardTitle>Verification Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground text-sm mb-2">
                No verification data available
              </p>
              <p className="text-muted-foreground text-xs">
                Verification status distribution will appear here once
                attendance is verified
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((sum, item) => sum + item.count, 0);

  // Calculate percentages for legend
  const dataWithPercentage = data.map((item) => ({
    ...item,
    percentage: total > 0 ? ((item.count / total) * 100).toFixed(1) : "0.0",
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verification Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart aria-label="Verification status pie chart">
            <Pie
              data={dataWithPercentage}
              cx="50%"
              cy="45%"
              labelLine={false}
              label={({ percentage }) => `${percentage}%`}
              outerRadius={95}
              innerRadius={0}
              fill="#16a34a"
              dataKey="count"
              nameKey="status"
            >
              {dataWithPercentage.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getStatusColor(entry.status)}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
                color: "hsl(var(--foreground))",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: number, name: string, props: any) => [
                `${value} (${props.payload.percentage}%)`,
                name,
              ]}
            />
            <Legend
              verticalAlign="bottom"
              height={50}
              wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }}
              iconSize={10}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value, entry: any) =>
                `${value}: ${entry.payload.count} (${entry.payload.percentage}%)`
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
