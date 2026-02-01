"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EventDetailDialog } from "@/components/dashboard/moderator/event-management/event-detail-dialog";
import {
  Calendar,
  Users,
  CheckCircle,
  Eye,
  Activity,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

interface ModeratorStats {
  totalEvents: number;
  activeEvents: number;
  totalAttendances: number;
}

interface SystemStats {
  totalUsers: number;
}

interface Event {
  id: string;
  name: string;
  startDateTime: Date;
  status: "Draft" | "Active" | "Completed" | "Cancelled";
  attendanceCount: number;
  creatorName?: string; // For admin view
}

interface ActivityLog {
  id: string;
  action: string;
  timestamp: Date;
  userName: string;
  userEmail: string;
  details: string | null;
  success: boolean;
}

interface ModeratorDashboardProps {
  userRole: "Moderator" | "Administrator";
  stats: ModeratorStats;
  systemStats?: SystemStats; // Only for admins
  myEvents: Event[];
  recentActivity: ActivityLog[];
  activityPagination?: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  onActivityPageChange?: (page: number) => void;
}

const statusColors = {
  Draft: "bg-gray-500",
  Active: "bg-green-500",
  Completed: "bg-blue-500",
  Cancelled: "bg-red-500",
} as const;

export function ModeratorDashboard({
  userRole,
  stats,
  systemStats,
  myEvents,
  recentActivity,
  activityPagination,
  onActivityPageChange: onActivityPageChangeProp,
}: ModeratorDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viewEventId, setViewEventId] = useState<string | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [selectedActivityLog, setSelectedActivityLog] =
    useState<ActivityLog | null>(null);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);

  const handleViewEvent = (eventId: string) => {
    setViewEventId(eventId);
    setIsEventDialogOpen(true);
  };

  const handleActivityPageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("activityPage", newPage.toString());
    router.push(`?${params.toString()}`);
    onActivityPageChangeProp?.(newPage);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">Events you created</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Events</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeEvents}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Attendances
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAttendances}</div>
            <p className="text-xs text-muted-foreground">
              Across all your events
            </p>
          </CardContent>
        </Card>

        {/* Admin-only stats */}
        {systemStats && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Users
                </CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemStats.totalUsers}
                </div>
                <p className="text-xs text-muted-foreground">
                  Registered users
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* System Activity Logs - Full width for admin, or spanning space for moderator */}
      {recentActivity && recentActivity.length > 0 && (
        <Card className="md:col-span-2 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Activity Logs
            </CardTitle>
            <Badge variant="outline">Last 30 days</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="max-w-[300px]">Details</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActivity.map((activity) => {
                    return (
                      <TableRow key={activity.id}>
                        <TableCell>
                          <Badge
                            variant={
                              activity.success ? "default" : "destructive"
                            }
                            className="text-xs whitespace-nowrap"
                          >
                            {activity.action.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium">
                              {activity.userName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {activity.userEmail}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          {activity.details ? (
                            <p className="text-xs text-muted-foreground truncate">
                              {activity.details}
                            </p>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <p className="text-sm">
                            {new Date(activity.timestamp).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </p>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <p className="text-sm text-muted-foreground">
                            {new Date(activity.timestamp).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              activity.success ? "outline" : "destructive"
                            }
                            className="text-xs"
                          >
                            {activity.success ? "Success" : "Failed"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            onClick={() => {
                              setSelectedActivityLog(activity);
                              setIsActivityDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {activityPagination && activityPagination.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {activityPagination.page} of{" "}
                  {activityPagination.totalPages} •{" "}
                  {activityPagination.totalItems} total{" "}
                  {activityPagination.totalItems === 1 ? "entry" : "entries"}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleActivityPageChange(activityPagination.page - 1)
                    }
                    disabled={activityPagination.page === 1}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleActivityPageChange(activityPagination.page + 1)
                    }
                    disabled={
                      activityPagination.page === activityPagination.totalPages
                    }
                    className="gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* My Events Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>My Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Name</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attendances</TableHead>
                  {userRole === "Administrator" && (
                    <TableHead>Created By</TableHead>
                  )}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myEvents.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={userRole === "Administrator" ? 6 : 5}
                      className="h-24 text-center"
                    >
                      No events found. Create your first event!
                    </TableCell>
                  </TableRow>
                ) : (
                  myEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">
                        {event.name}
                      </TableCell>
                      <TableCell>
                        {new Date(event.startDateTime).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[event.status]}>
                          {event.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{event.attendanceCount}</TableCell>
                      {userRole === "Administrator" && (
                        <TableCell>{event.creatorName || "N/A"}</TableCell>
                      )}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => handleViewEvent(event.id)}
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <EventDetailDialog
        eventId={viewEventId}
        open={isEventDialogOpen}
        onOpenChange={(open) => {
          setIsEventDialogOpen(open);
          if (!open) {
            setViewEventId(null);
          }
        }}
      />

      {/* Activity Log Detail Dialog */}
      <Dialog
        open={isActivityDialogOpen}
        onOpenChange={setIsActivityDialogOpen}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Activity Log Details</DialogTitle>
            <DialogClose />
          </DialogHeader>
          {selectedActivityLog && (
            <div className="space-y-6 pb-4">
              {/* Action */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">Action</label>
                <p className="text-sm text-muted-foreground wrap-break-words">
                  {selectedActivityLog.action.replace(/_/g, " ")}
                </p>
              </div>

              {/* User Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">User Name</label>
                  <p className="text-sm text-muted-foreground wrap-break-words">
                    {selectedActivityLog.userName}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">User Email</label>
                  <p className="text-sm text-muted-foreground wrap-break-words">
                    {selectedActivityLog.userEmail}
                  </p>
                </div>
              </div>

              {/* Timestamp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Date</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedActivityLog.timestamp).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      },
                    )}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Time</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedActivityLog.timestamp).toLocaleTimeString(
                      "en-US",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      },
                    )}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">Status</label>
                <div>
                  <Badge
                    variant={
                      selectedActivityLog.success ? "outline" : "destructive"
                    }
                  >
                    {selectedActivityLog.success ? "Success" : "Failed"}
                  </Badge>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">Details</label>
                <div className="bg-muted rounded p-3 min-h-20 max-h-60 overflow-y-auto overflow-x-hidden">
                  {selectedActivityLog.details ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedActivityLog.details.replace(/,/g, ",\n")}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No additional details available
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
