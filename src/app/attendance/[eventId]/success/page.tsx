import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, XCircle, Calendar, MapPin } from "lucide-react";
import Link from "next/link";
import { AttendanceSuccessMap } from "@/components/attendance/attendance-success-map";

interface AttendanceSuccessPageProps {
  params: Promise<{ eventId: string }>;
}

/**
 * Attendance success confirmation page
 * Shows submission status and event details
 */
export default async function AttendanceSuccessPage({
  params,
}: AttendanceSuccessPageProps) {
  const { eventId } = await params;

  // Get user session
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }

  // Fetch event details
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      description: true,
      startDateTime: true,
      endDateTime: true,
      venueName: true,
      venueAddress: true,
      venueLatitude: true,
      venueLongitude: true,
    },
  });

  if (!event) {
    notFound();
  }

  // Fetch attendance record
  const attendance = await db.attendance.findUnique({
    where: {
      eventId_userId: {
        eventId,
        userId: user.userId,
      },
    },
    select: {
      id: true,
      checkInSubmittedAt: true,
      checkOutSubmittedAt: true,
      verificationStatus: true,
      verifiedAt: true,
      disputeNote: true,
      checkInDistance: true,
      checkOutDistance: true,
      checkInLatitude: true,
      checkInLongitude: true,
      checkOutLatitude: true,
      checkOutLongitude: true,
    },
  });

  if (!attendance) {
    redirect(`/attendance/${eventId}`);
  }

  // Status badge configuration
  const statusConfig: Record<
    "Pending" | "Approved" | "Rejected",
    {
      icon: typeof Clock;
      variant: "default" | "secondary" | "destructive";
      label: string;
      description: string;
    }
  > = {
    Pending: {
      icon: Clock,
      variant: "secondary" as const,
      label: "Pending Verification",
      description:
        "Your attendance is awaiting verification by a moderator. You will be notified once it's reviewed.",
    },
    Approved: {
      icon: CheckCircle2,
      variant: "default" as const,
      label: "Verified",
      description:
        "Your attendance has been successfully verified and recorded. Thank you for participating!",
    },
    Rejected: {
      icon: XCircle,
      variant: "destructive" as const,
      label: "Not Verified",
      description:
        attendance.disputeNote ||
        "Your attendance could not be verified. Please contact a moderator for more information.",
    },
  };

  const status =
    statusConfig[
      attendance.verificationStatus as "Pending" | "Approved" | "Rejected"
    ];

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Success Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div
            className={`rounded-full p-4 ${
              attendance.verificationStatus === "Approved"
                ? "bg-green-100 dark:bg-green-900/20"
                : attendance.verificationStatus === "Rejected"
                  ? "bg-red-100 dark:bg-red-900/20"
                  : "bg-blue-100 dark:bg-blue-900/20"
            }`}
          >
            <status.icon
              className={`h-12 w-12 ${
                attendance.verificationStatus === "Approved"
                  ? "text-green-600 dark:text-green-400"
                  : attendance.verificationStatus === "Rejected"
                    ? "text-red-600 dark:text-red-400"
                    : "text-blue-600 dark:text-blue-400"
              }`}
            />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Attendance Submitted
        </h1>
        <p className="text-muted-foreground">{status.description}</p>
        <Badge variant={status.variant} className="text-sm">
          {status.label}
        </Badge>
      </div>

      {/* Event Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Column: Event Information */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{event.name}</h3>
                {event.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {event.description}
                  </p>
                )}
              </div>

              <div className="grid gap-3">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Date & Time</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.startDateTime).toLocaleString("en-US", {
                        dateStyle: "full",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Venue</p>
                    <p className="text-sm text-muted-foreground">
                      {event.venueName}
                    </p>
                    {event.venueAddress && (
                      <p className="text-sm text-muted-foreground">
                        {event.venueAddress}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Map */}
            <div>
              <AttendanceSuccessMap
                venueLatitude={event.venueLatitude}
                venueLongitude={event.venueLongitude}
                venueName={event.venueName}
                checkInLatitude={attendance.checkInLatitude}
                checkInLongitude={attendance.checkInLongitude}
                checkOutLatitude={attendance.checkOutLatitude}
                checkOutLongitude={attendance.checkOutLongitude}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {attendance.checkInSubmittedAt && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Check-In At:
              </span>
              <span className="text-sm font-medium">
                {new Date(attendance.checkInSubmittedAt).toLocaleString(
                  "en-US",
                  {
                    dateStyle: "medium",
                    timeStyle: "short",
                  },
                )}
              </span>
            </div>
          )}

          {attendance.checkOutSubmittedAt && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Check-Out At:
              </span>
              <span className="text-sm font-medium">
                {new Date(attendance.checkOutSubmittedAt).toLocaleString(
                  "en-US",
                  {
                    dateStyle: "medium",
                    timeStyle: "short",
                  },
                )}
              </span>
            </div>
          )}

          {attendance.checkInDistance !== null && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Check-In Distance:
              </span>
              <span className="text-sm font-medium">
                {attendance.checkInDistance.toFixed(0)} meters
              </span>
            </div>
          )}

          {attendance.checkOutDistance !== null && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Check-Out Distance:
              </span>
              <span className="text-sm font-medium">
                {attendance.checkOutDistance.toFixed(0)} meters
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>

          {attendance.verifiedAt && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Verified At:
              </span>
              <span className="text-sm font-medium">
                {new Date(attendance.verifiedAt).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          )}

          {attendance.disputeNote && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-3">
              <p className="text-sm font-medium text-destructive mb-1">
                Verification Note
              </p>
              <p className="text-sm text-muted-foreground">
                {attendance.disputeNote}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-center">
        <Button asChild variant="default" size="lg">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>

      {/* Help Text */}
      {attendance.verificationStatus === "Pending" && (
        <div className="text-center text-sm text-muted-foreground">
          <p>
            You can view your attendance status anytime from your dashboard.
          </p>
        </div>
      )}
    </div>
  );
}
