import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { appealAttendance } from "@/actions/attendance/appeal";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export const metadata: Metadata = {
  title: "Attendance Details | Event Attendance",
  description: "View attendance details and request review",
};

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

async function AttendanceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user || user.role !== "Student") {
    redirect("/auth/login");
  }

  // Fetch attendance record with event details
  const attendance = await db.attendance.findUnique({
    where: { id },
    include: {
      Event: {
        select: {
          name: true,
          venueName: true,
          startDateTime: true,
        },
      },
      User_Attendance_userIdToUser: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      User_Attendance_verifiedByIdToUser: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!attendance) {
    redirect("/dashboard/student");
  }

  // Verify ownership
  if (attendance.userId !== user.userId) {
    redirect("/dashboard/student");
  }

  const statusColors: Record<string, string> = {
    Pending: "bg-yellow-100 text-yellow-800",
    Approved: "bg-green-100 text-green-800",
    Rejected: "bg-red-100 text-red-800",
  };

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="mb-6">
        <Link href="/dashboard/student">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Details</CardTitle>
          <CardDescription>
            {attendance.checkInSubmittedAt && (
              <span>
                Check-In:{" "}
                {format(
                  new Date(attendance.checkInSubmittedAt),
                  "MMM dd, yyyy 'at' h:mm a",
                )}
              </span>
            )}
            {attendance.checkOutSubmittedAt && (
              <span className="ml-4">
                Check-Out:{" "}
                {format(
                  new Date(attendance.checkOutSubmittedAt),
                  "MMM dd, yyyy 'at' h:mm a",
                )}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Event Information */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Event Information</h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Event Name
                </dt>
                <dd className="text-sm">{attendance.Event.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Venue
                </dt>
                <dd className="text-sm">{attendance.Event.venueName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Event Date
                </dt>
                <dd className="text-sm">
                  {format(
                    new Date(attendance.Event.startDateTime),
                    "MMM dd, yyyy 'at' h:mm a",
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {/* Verification Status */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Verification Status</h3>
            <div className="flex items-center gap-4">
              <Badge
                className={
                  statusColors[attendance.verificationStatus] ||
                  "bg-gray-100 text-gray-800"
                }
              >
                {attendance.verificationStatus}
              </Badge>
              {attendance.User_Attendance_verifiedByIdToUser && (
                <span className="text-sm text-muted-foreground">
                  Verified by{" "}
                  {attendance.User_Attendance_verifiedByIdToUser.firstName}{" "}
                  {attendance.User_Attendance_verifiedByIdToUser.lastName}
                  {attendance.verifiedAt && (
                    <>
                      {" "}
                      on{" "}
                      {format(
                        new Date(attendance.verifiedAt),
                        "MMM dd, yyyy 'at' h:mm a",
                      )}
                    </>
                  )}
                </span>
              )}
            </div>
            {attendance.disputeNote && (
              <div className="mt-4 p-4 bg-muted rounded-md">
                <p className="text-sm font-medium mb-1">Note from Moderator:</p>
                <p className="text-sm">{attendance.disputeNote}</p>
              </div>
            )}
            {attendance.resolutionNotes && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm font-medium mb-1 text-destructive">
                  Resolution Notes:
                </p>
                <p className="text-sm text-destructive-foreground">
                  {attendance.resolutionNotes}
                </p>
              </div>
            )}
          </div>

          {/* Check-In Details */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Check-In Details</h3>
            <div className="space-y-4">
              {/* Check-In Timestamp and Location */}
              <div className="grid grid-cols-2 gap-4">
                {attendance.checkInSubmittedAt && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">
                      Timestamp
                    </dt>
                    <dd className="text-sm">
                      {format(
                        new Date(attendance.checkInSubmittedAt),
                        "MMM dd, yyyy 'at' h:mm a",
                      )}
                    </dd>
                  </div>
                )}
                {attendance.checkInDistance !== null && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">
                      Distance from Venue
                    </dt>
                    <dd className="text-sm">
                      {attendance.checkInDistance.toFixed(1)} meters
                    </dd>
                  </div>
                )}
                {attendance.checkInLatitude !== null &&
                  attendance.checkInLongitude !== null && (
                    <div className="col-span-2">
                      <dt className="text-sm font-medium text-muted-foreground">
                        GPS Coordinates
                      </dt>
                      <dd className="text-sm">
                        {attendance.checkInLatitude},{" "}
                        {attendance.checkInLongitude}
                      </dd>
                    </div>
                  )}
              </div>

              {/* Check-In Photos */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Photos</h4>
                {attendance.checkInFrontPhoto || attendance.checkInBackPhoto ? (
                  <div className="grid grid-cols-2 gap-4">
                    {attendance.checkInFrontPhoto && (
                      <div>
                        <p className="text-xs font-medium mb-2 text-muted-foreground">
                          Front Photo
                        </p>
                        <div className="relative aspect-square rounded-md overflow-hidden border">
                          <Image
                            src={attendance.checkInFrontPhoto}
                            alt="Check-in front photo"
                            fill
                            className="object-cover"
                          />
                        </div>
                      </div>
                    )}
                    {attendance.checkInBackPhoto && (
                      <div>
                        <p className="text-xs font-medium mb-2 text-muted-foreground">
                          Back Photo
                        </p>
                        <div className="relative aspect-square rounded-md overflow-hidden border">
                          <Image
                            src={attendance.checkInBackPhoto}
                            alt="Check-in back photo"
                            fill
                            className="object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No check-in photos available
                  </p>
                )}
              </div>

              {/* Check-In Signature */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Signature</h4>
                {attendance.checkInSignature ? (
                  <div className="relative w-full max-w-md h-32 rounded-md overflow-hidden border bg-white">
                    <Image
                      src={attendance.checkInSignature}
                      alt="Check-in signature"
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No check-in signature available
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Check-Out Details */}
          {attendance.checkOutSubmittedAt && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Check-Out Details</h3>
              <div className="space-y-4">
                {/* Check-Out Timestamp and Location */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">
                      Timestamp
                    </dt>
                    <dd className="text-sm">
                      {format(
                        new Date(attendance.checkOutSubmittedAt),
                        "MMM dd, yyyy 'at' h:mm a",
                      )}
                    </dd>
                  </div>
                  {attendance.checkOutDistance !== null && (
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">
                        Distance from Venue
                      </dt>
                      <dd className="text-sm">
                        {attendance.checkOutDistance.toFixed(1)} meters
                      </dd>
                    </div>
                  )}
                  {attendance.checkOutLatitude !== null &&
                    attendance.checkOutLongitude !== null && (
                      <div className="col-span-2">
                        <dt className="text-sm font-medium text-muted-foreground">
                          GPS Coordinates
                        </dt>
                        <dd className="text-sm">
                          {attendance.checkOutLatitude},{" "}
                          {attendance.checkOutLongitude}
                        </dd>
                      </div>
                    )}
                </div>

                {/* Check-Out Photos */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Photos</h4>
                  {attendance.checkOutFrontPhoto ||
                  attendance.checkOutBackPhoto ? (
                    <div className="grid grid-cols-2 gap-4">
                      {attendance.checkOutFrontPhoto && (
                        <div>
                          <p className="text-xs font-medium mb-2 text-muted-foreground">
                            Front Photo
                          </p>
                          <div className="relative aspect-square rounded-md overflow-hidden border">
                            <Image
                              src={attendance.checkOutFrontPhoto}
                              alt="Check-out front photo"
                              fill
                              className="object-cover"
                            />
                          </div>
                        </div>
                      )}
                      {attendance.checkOutBackPhoto && (
                        <div>
                          <p className="text-xs font-medium mb-2 text-muted-foreground">
                            Back Photo
                          </p>
                          <div className="relative aspect-square rounded-md overflow-hidden border">
                            <Image
                              src={attendance.checkOutBackPhoto}
                              alt="Check-out back photo"
                              fill
                              className="object-cover"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No check-out photos available
                    </p>
                  )}
                </div>

                {/* Check-Out Signature */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Signature</h4>
                  {attendance.checkOutSignature ? (
                    <div className="relative w-full max-w-md h-32 rounded-md overflow-hidden border bg-white">
                      <Image
                        src={attendance.checkOutSignature}
                        alt="Check-out signature"
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No check-out signature available
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Appeal Form - Only show for Rejected status */}
          {attendance.verificationStatus === "Rejected" && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Request Review</h3>
              <p className="text-sm text-muted-foreground mb-4">
                If you believe your attendance was incorrectly rejected, you can
                request a review from an administrator. Please provide details
                about why you think this decision should be reconsidered.
              </p>
              <form
                action={async (formData: FormData) => {
                  "use server";
                  const appealMessage = formData.get("appealMessage") as string;
                  const result = await appealAttendance(id, {
                    appealMessage,
                  });

                  if (result.success) {
                    redirect("/dashboard/student");
                  }
                }}
              >
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="appealMessage">Appeal Message</Label>
                    <Textarea
                      id="appealMessage"
                      name="appealMessage"
                      placeholder="Explain why you believe this attendance should be approved..."
                      required
                      minLength={10}
                      maxLength={1000}
                      rows={6}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Minimum 10 characters, maximum 1000 characters
                    </p>
                  </div>
                  <Button type="submit" className="w-full sm:w-auto">
                    Submit Appeal
                  </Button>
                </div>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AttendanceDetailPage;
