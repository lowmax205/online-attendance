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
 * T052: EventStatusChart Component
 * Phase 3.12 - UI Components - Analytics Dashboard
 *
 * Displays event status distribution using Recharts PieChart
 */

interface StatusData {
  status: string;
  count: number;
}

interface EventStatusChartProps {
  data: StatusData[];
  isLoading?: boolean;
}

const COLORS = {
  Active: "#06b6d4",
  Completed: "#8b5cf6",
  Cancelled: "#f43f5e",
  UPCOMING: "#06b6d4",
  ONGOING: "#ea580c",
  COMPLETED: "#8b5cf6",
  CANCELLED: "#f43f5e",
};

export function EventStatusChart({ data, isLoading }: EventStatusChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Event Status Distribution</CardTitle>
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
          <CardTitle>Event Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground text-sm mb-2">
                No event status data available
              </p>
              <p className="text-muted-foreground text-xs">
                Event status distribution will appear here once events are
                created
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
        <CardTitle>Event Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart aria-label="Event status pie chart">
            <Pie
              data={dataWithPercentage}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ percentage }) => `${percentage}%`}
              outerRadius={85}
              innerRadius={0}
              fill="#16a34a"
              dataKey="count"
              nameKey="status"
            >
              {dataWithPercentage.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    COLORS[entry.status as keyof typeof COLORS] || "#16a34a"
                  }
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
