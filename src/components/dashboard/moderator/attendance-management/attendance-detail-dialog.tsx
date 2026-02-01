"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { CheckCircle } from "lucide-react";
import Image from "next/image";

interface AttendanceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attendance: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      UserProfile: {
        studentId: string;
        department: string;
        course: string;
        yearLevel: number;
        section: string | null;
        contactNumber: string | null;
        campus?: string;
      } | null;
    };
    event: {
      name: string;
      startDateTime: Date;
      venueName: string;
    };
    checkInSubmittedAt: Date;
    checkInFrontPhoto: string | null;
    checkInBackPhoto: string | null;
    checkInSignature: string | null;
    checkInLatitude: number | null;
    checkInLongitude: number | null;
    checkInDistance: number | null;
    checkOutSubmittedAt: Date | null;
    checkOutFrontPhoto: string | null;
    checkOutBackPhoto: string | null;
    checkOutSignature: string | null;
    checkOutLatitude: number | null;
    checkOutLongitude: number | null;
    checkOutDistance: number | null;
    verificationStatus: VerificationStatusValue;
    disputeNote: string | null;
    appealMessage: string | null;
    resolutionNotes: string | null;
    verifiedAt: Date | null;
    verifiedBy: {
      firstName: string;
      lastName: string;
    } | null;
  } | null;
  onVerify?: () => void;
}

const VERIFICATION_STATUSES = ["Pending", "Approved", "Rejected"] as const;

type VerificationStatusValue = (typeof VERIFICATION_STATUSES)[number];

const statusVariant: Record<
  VerificationStatusValue,
  "default" | "secondary" | "destructive" | "outline"
> = {
  Pending: "secondary",
  Approved: "default",
  Rejected: "destructive",
};

function normalizeVerificationStatus(value: unknown): VerificationStatusValue {
  if (typeof value === "string") {
    const match = VERIFICATION_STATUSES.find(
      (status) => status.toLowerCase() === value.toLowerCase(),
    );
    if (match) {
      return match;
    }
  }
  return "Pending";
}

export function AttendanceDetailDialog({
  open,
  onOpenChange,
  attendance,
  onVerify,
}: AttendanceDetailDialogProps) {
  if (!attendance) return null;

  const normalizedStatus = normalizeVerificationStatus(
    attendance.verificationStatus,
  );
  const canTriggerVerify = Boolean(onVerify) && normalizedStatus === "Pending";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Attendance Details</DialogTitle>
          <DialogDescription>
            Complete information for this attendance submission
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Student Information */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Student Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Full Name:</span>
                <p className="font-medium">
                  {attendance.user.firstName} {attendance.user.lastName}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Student ID:</span>
                <p className="font-medium">
                  {attendance.user.UserProfile?.studentId || "N/A"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Email Address:</span>
                <p className="font-medium">{attendance.user.email}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Contact Number:</span>
                <p className="font-medium">
                  {attendance.user.UserProfile?.contactNumber || "N/A"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">
                  Department/Colleges:
                </span>
                <p className="font-medium">
                  {attendance.user.UserProfile?.department || "N/A"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Course/Program:</span>
                <p className="font-medium">
                  {attendance.user.UserProfile?.course || "N/A"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Year Level:</span>
                <p className="font-medium">
                  {attendance.user.UserProfile?.yearLevel
                    ? `Year ${attendance.user.UserProfile.yearLevel}`
                    : "N/A"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Section:</span>
                <p className="font-medium">
                  {attendance.user.UserProfile?.section || "N/A"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Campus:</span>
                <p className="font-medium">
                  {attendance.user.UserProfile?.campus || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Event Information */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Event Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Event:</span>
                <p className="font-medium">{attendance.event.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Venue:</span>
                <p className="font-medium">{attendance.event.venueName}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Event Date:</span>
                <p className="font-medium">
                  {format(
                    new Date(attendance.event.startDateTime),
                    "MMMM d, yyyy 'at' h:mm a",
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Verification Status */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Verification Status</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Status:</span>
                <div className="mt-1">
                  <Badge variant={statusVariant[normalizedStatus]}>
                    {normalizedStatus}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Check-In Details */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Check-In Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Check-In Time:</span>
                <p className="font-medium">
                  {format(
                    new Date(attendance.checkInSubmittedAt),
                    "MMMM d, yyyy 'at' h:mm a",
                  )}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">
                  Distance from Venue:
                </span>
                <p className="font-medium">
                  {attendance.checkInDistance !== null
                    ? `${attendance.checkInDistance.toFixed(0)} meters`
                    : "N/A"}
                </p>
              </div>
              {attendance.checkInLatitude && attendance.checkInLongitude && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">
                    GPS Coordinates:
                  </span>
                  <p className="font-medium text-xs">
                    {attendance.checkInLatitude.toFixed(6)},{" "}
                    {attendance.checkInLongitude.toFixed(6)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Check-Out Details */}
          {attendance.checkOutSubmittedAt && (
            <div>
              <h3 className="font-semibold text-lg mb-3">Check-Out Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Check-Out Time:</span>
                  <p className="font-medium">
                    {format(
                      new Date(attendance.checkOutSubmittedAt),
                      "MMMM d, yyyy 'at' h:mm a",
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Distance from Venue:
                  </span>
                  <p className="font-medium">
                    {attendance.checkOutDistance !== null
                      ? `${attendance.checkOutDistance.toFixed(0)} meters`
                      : "N/A"}
                  </p>
                </div>
                {attendance.checkOutLatitude &&
                  attendance.checkOutLongitude && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">
                        GPS Coordinates:
                      </span>
                      <p className="font-medium text-xs">
                        {attendance.checkOutLatitude.toFixed(6)},{" "}
                        {attendance.checkOutLongitude.toFixed(6)}
                      </p>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* Check-In Photos and Signature */}
          <div>
            <h3 className="font-semibold text-lg mb-3">
              Check-In Photos & Signature
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {attendance.checkInFrontPhoto && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Front Photo
                  </p>
                  <div className="relative h-40 border rounded overflow-hidden">
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
                  <p className="text-sm text-muted-foreground mb-2">
                    Back Photo
                  </p>
                  <div className="relative h-40 border rounded overflow-hidden">
                    <Image
                      src={attendance.checkInBackPhoto}
                      alt="Check-in back photo"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              )}
              {attendance.checkInSignature && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Signature
                  </p>
                  <div className="relative h-40 border rounded overflow-hidden bg-white">
                    <Image
                      src={attendance.checkInSignature}
                      alt="Check-in signature"
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Check-Out Photos and Signature */}
          {attendance.checkOutSubmittedAt && (
            <div>
              <h3 className="font-semibold text-lg mb-3">
                Check-Out Photos & Signature
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {attendance.checkOutFrontPhoto && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Front Photo
                    </p>
                    <div className="relative h-40 border rounded overflow-hidden">
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
                    <p className="text-sm text-muted-foreground mb-2">
                      Back Photo
                    </p>
                    <div className="relative h-40 border rounded overflow-hidden">
                      <Image
                        src={attendance.checkOutBackPhoto}
                        alt="Check-out back photo"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                )}
                {attendance.checkOutSignature && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Signature
                    </p>
                    <div className="relative h-40 border rounded overflow-hidden bg-white">
                      <Image
                        src={attendance.checkOutSignature}
                        alt="Check-out signature"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Verification Details */}
          {(attendance.disputeNote ||
            attendance.appealMessage ||
            attendance.resolutionNotes) && (
            <div>
              <h3 className="font-semibold text-lg mb-3">
                Verification Details
              </h3>
              <div className="space-y-3">
                {attendance.disputeNote && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Dispute Notes:
                    </span>
                    <p className="text-sm mt-1 p-3 bg-destructive/10 rounded">
                      {attendance.disputeNote}
                    </p>
                  </div>
                )}
                {attendance.appealMessage && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Appeal Message:
                    </span>
                    <p className="text-sm mt-1 p-3 bg-secondary rounded">
                      {attendance.appealMessage}
                    </p>
                  </div>
                )}
                {attendance.resolutionNotes && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Resolution Notes:
                    </span>
                    <p className="text-sm mt-1 p-3 bg-muted rounded">
                      {attendance.resolutionNotes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {attendance.verifiedBy && attendance.verifiedAt && (
            <div className="text-sm text-muted-foreground">
              Verified by {attendance.verifiedBy.firstName}{" "}
              {attendance.verifiedBy.lastName} on{" "}
              {format(
                new Date(attendance.verifiedAt),
                "MMMM d, yyyy 'at' h:mm a",
              )}
            </div>
          )}

          {/* Actions */}
          {canTriggerVerify && (
            <div className="flex justify-end pt-4">
              <Button onClick={onVerify}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Verify Attendance
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
