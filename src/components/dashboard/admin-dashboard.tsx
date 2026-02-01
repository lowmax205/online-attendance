"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Calendar,
  CheckCircle,
  TrendingUp,
  Settings,
  Activity,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface SystemStats {
  totalUsers: number;
  totalEvents: number;
  totalAttendances: number;
  verificationRate: number;
  totalStudents: number;
  totalModerators: number;
  totalAdministrators: number;
}

interface SystemConfig {
  defaultGPSRadius: number;
  defaultCheckInBufferMins: number;
  defaultCheckOutBufferMins: number;
}

interface RecentActivity {
  id: string;
  action: string;
  userId: string;
  userName: string;
  timestamp: Date;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

interface Alert {
  id: string;
  type: "warning" | "error" | "info";
  message: string;
  timestamp: Date;
}

interface AdminDashboardProps {
  stats: SystemStats;
  systemConfig: SystemConfig;
  recentActivity: RecentActivity[];
  alerts: Alert[];
  onUpdateConfig: (config: SystemConfig) => Promise<void>;
}

const alertColors = {
  warning: "bg-yellow-500",
  error: "bg-red-500",
  info: "bg-blue-500",
} as const;

export function AdminDashboard({
  stats,
  systemConfig,
  recentActivity,
  alerts,
  onUpdateConfig,
}: AdminDashboardProps) {
  const [config, setConfig] = useState<SystemConfig>(systemConfig);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateConfig = async () => {
    setIsUpdating(true);
    try {
      await onUpdateConfig(config);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards - Row 1 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Across all roles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">All events created</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Attendances
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAttendances}</div>
            <p className="text-xs text-muted-foreground">
              All check-ins recorded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Verification Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.verificationRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Attendances verified
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Role Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Role Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Students</p>
              <p className="text-2xl font-bold">{stats.totalStudents}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Moderators</p>
              <p className="text-2xl font-bold">{stats.totalModerators}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Administrators</p>
              <p className="text-2xl font-bold">{stats.totalAdministrators}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="gpsRadius">Default GPS Radius (meters)</Label>
                <Input
                  id="gpsRadius"
                  type="number"
                  min="1"
                  value={config.defaultGPSRadius}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      defaultGPSRadius: parseInt(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Location verification tolerance
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="checkInBuffer">Check-in Buffer (minutes)</Label>
                <Input
                  id="checkInBuffer"
                  type="number"
                  min="0"
                  value={config.defaultCheckInBufferMins}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      defaultCheckInBufferMins: parseInt(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Time before event start
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="checkOutBuffer">
                  Check-out Buffer (minutes)
                </Label>
                <Input
                  id="checkOutBuffer"
                  type="number"
                  min="0"
                  value={config.defaultCheckOutBufferMins}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      defaultCheckOutBufferMins: parseInt(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Time after event end
                </p>
              </div>
            </div>

            <Button onClick={handleUpdateConfig} disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Save Configuration"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActivity.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">
                        No recent activity
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentActivity.slice(0, 5).map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell className="font-medium">
                          {activity.action}
                        </TableCell>
                        <TableCell>{activity.userName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleTimeString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* System Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              System Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No active alerts
                </p>
              ) : (
                alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <Badge className={alertColors[alert.type]}>
                      {alert.type.toUpperCase()}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Dashboard Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Events This Month
              </p>
              <p className="text-3xl font-bold">{stats.totalEvents}</p>
              <p className="text-xs text-green-600">+12% from last month</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Attendances This Month
              </p>
              <p className="text-3xl font-bold">{stats.totalAttendances}</p>
              <p className="text-xs text-green-600">+8% from last month</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Average Attendance Rate
              </p>
              <p className="text-3xl font-bold">
                {stats.verificationRate.toFixed(0)}%
              </p>
              <p className="text-xs text-green-600">+2% from last month</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
