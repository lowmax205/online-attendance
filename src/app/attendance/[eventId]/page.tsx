import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { AttendanceFormWrapper } from "@/components/attendance/attendance-form-wrapper";
import { LoginPrompt } from "@/components/auth/login-prompt";
import { format } from "date-fns";

interface AttendanceFormPageProps {
  params: Promise<{ eventId: string }>;
}

/**
 * Attendance form page for a specific event
 * Pre-fetches event details and renders attendance form
 */
export default async function AttendanceFormPage({
  params,
}: AttendanceFormPageProps) {
  const { eventId } = await params;

  // Fetch event details first so unauthenticated users can still see event context
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
      checkInBufferMins: true,
      checkOutBufferMins: true,
      status: true,
      qrCodePayload: true,
    },
  });

  if (!event) {
    notFound();
  }

  // Get user session
  const user = await getCurrentUser();

  // If not logged in, show login modal prompt with returnUrl back to this page
  if (!user) {
    return <LoginPrompt returnUrl={`/attendance/${eventId}`} />;
  }

  // Check if user profile is complete
  const userProfile = await db.userProfile.findUnique({
    where: { userId: user.userId },
  });

  if (!userProfile) {
    // Redirect to profile creation with return URL to come back to attendance
    const returnUrl = encodeURIComponent(`/attendance/${eventId}`);
    return (
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
          <h2 className="text-lg font-semibold text-destructive mb-2">
            Profile Incomplete
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            You need to complete your profile before checking in to events.
          </p>
          <a
            href={`/profile/create?returnUrl=${returnUrl}`}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Complete Profile
          </a>
        </div>
      </div>
    );
  }

  // Check existing attendance record
  const existingAttendance = await db.attendance.findUnique({
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
    },
  });

  // Calculate attendance windows
  // Check-IN: Event START to START + checkInBufferMins
  // Check-OUT: END - checkOutBufferMins to END
  const now = new Date();
  const checkInOpens = event.startDateTime;
  const checkInCloses = new Date(
    event.startDateTime.getTime() + event.checkInBufferMins * 60 * 1000,
  );
  const checkOutOpens = new Date(
    event.endDateTime.getTime() - event.checkOutBufferMins * 60 * 1000,
  );
  const checkOutCloses = event.endDateTime;

  // Determine current attendance phase
  const isCheckInWindow = now >= checkInOpens && now <= checkInCloses;
  const isCheckOutWindow = now >= checkOutOpens && now <= checkOutCloses;
  const hasCheckedIn = existingAttendance?.checkInSubmittedAt != null;
  const hasCheckedOut = existingAttendance?.checkOutSubmittedAt != null;

  // Determine attendance type needed
  let attendanceType: "check-in" | "check-out" | null = null;
  let errorMessage: string | null = null;

  // Priority 1: Check if both are completed
  if (hasCheckedIn && hasCheckedOut) {
    redirect(`/attendance/${eventId}/success`);
  }

  // Priority 2: Check-in window is open and hasn't checked in
  if (isCheckInWindow && !hasCheckedIn) {
    attendanceType = "check-in";
  }
  // Priority 3: Check-out window is open and hasn't checked out (regardless of check-in)
  else if (isCheckOutWindow && !hasCheckedOut) {
    attendanceType = "check-out";
  }
  // Priority 4: Already checked in during check-in window, waiting for check-out
  else if (isCheckInWindow && hasCheckedIn && !hasCheckedOut) {
    errorMessage = `You have already checked in. Check-out opens at ${format(checkOutOpens, "MMMM d, yyyy • h:mm a")}`;
  }
  // Priority 5: Check-out window not yet open
  else if (
    !isCheckInWindow &&
    !isCheckOutWindow &&
    now < checkOutOpens &&
    !hasCheckedOut
  ) {
    // Between check-in close and check-out open
    errorMessage = `Check-in has ended. Check-out will be available at ${format(checkOutOpens, "MMMM d, yyyy • h:mm a")}.`;
  }
  // Priority 6: Before check-in window
  else if (now < checkInOpens) {
    errorMessage = `Check-in opens at ${format(checkInOpens, "MMMM d, yyyy • h:mm a")}`;
  }
  // Priority 7: After check-out window
  else if (now > checkOutCloses) {
    if (hasCheckedOut) {
      errorMessage = `You have already checked out for this event.`;
    } else {
      errorMessage = `Event has ended at ${format(checkOutCloses, "MMMM d, yyyy • h:mm a")}`;
    }
  }
  // Default fallback
  else if (hasCheckedOut) {
    errorMessage = `You have already checked out for this event.`;
  }

  // Check if event is accessible
  if (event.status === "Cancelled") {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
          <h2 className="text-lg font-semibold text-destructive mb-2">
            Event Cancelled
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            This event has been cancelled and is no longer accepting attendance.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <div className="rounded-lg border border-warning bg-warning/10 p-6">
          <h2 className="text-lg font-semibold mb-2">
            Attendance Not Available Yet!
          </h2>
          <p className="text-sm text-muted-foreground mb-4">{errorMessage}</p>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (!attendanceType) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <div className="rounded-lg border border-warning bg-warning/10 p-6">
          <h2 className="text-lg font-semibold mb-2">No Action Required</h2>
          <p className="text-sm text-muted-foreground mb-4">
            There is no attendance action available at this time.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Render attendance form
  // Normalize role to lowercase and map "administrator" to "admin"
  let mappedRole: "student" | "moderator" | "admin" = "student";
  const roleLower = user.role.toLowerCase();

  if (roleLower === "administrator") {
    mappedRole = "admin";
  } else if (roleLower === "moderator") {
    mappedRole = "moderator";
  } else {
    mappedRole = "student";
  }

  return (
    <AttendanceFormWrapper
      event={{
        id: event.id,
        name: event.name,
        description: event.description || "",
        startDateTime: event.startDateTime.toISOString(),
        endDateTime: event.endDateTime.toISOString(),
        venueName: event.venueName,
        venueAddress: event.venueAddress || "",
        venueLatitude: event.venueLatitude,
        venueLongitude: event.venueLongitude,
      }}
      attendanceType={attendanceType}
      userRole={mappedRole}
    />
  );
}
