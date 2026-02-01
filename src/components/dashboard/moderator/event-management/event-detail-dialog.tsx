"use client";

import { usePrintQRCode } from "@/hooks/use-print-qr-code";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getEventById } from "@/actions/events/get-by-id";
import { regenerateQRCode } from "@/actions/events/generate-qr";
import { getAttendanceMapData } from "@/actions/events/get-attendance-map-data";
import { EventDetailMap } from "@/components/events/event-detail-map";
import { useToast } from "@/hooks/use-toast";
import { EventStatus } from "@prisma/client";
import { format } from "date-fns";
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Printer,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateEventCode, formatEventCode } from "@/lib/url-shortener";

const statusVariant: Record<
  EventStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  Active: "default",
  Completed: "secondary",
  Cancelled: "destructive",
};

interface EventDetailDialogProps {
  eventId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type EventDetailState = {
  id: string;
  name: string;
  description: string | null;
  startDateTime: string;
  endDateTime: string;
  venueName: string;
  venueAddress: string | null;
  campus: string;
  venueLatitude: number;
  venueLongitude: number;
  checkInBufferMins: number;
  checkOutBufferMins: number;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
  qrCodeUrl: string | null;
  qrCodePayload: string | null;
  shortUrl: string | null;
  _count: {
    Attendance: number;
  };
  createdBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: string;
  };
};

export function EventDetailDialog({
  eventId,
  open,
  onOpenChange,
}: EventDetailDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [event, setEvent] = React.useState<EventDetailState | null>(null);
  const [isRegenerating, startRegeneration] = React.useTransition();
  const [copied, setCopied] = React.useState(false);
  const copyResetRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Attendance map data state
  const [attendanceMapData, setAttendanceMapData] = React.useState<{
    attendances: Array<{
      id: string;
      checkInLatitude: number | null;
      checkInLongitude: number | null;
      checkOutLatitude: number | null;
      checkOutLongitude: number | null;
      verificationStatus: string;
      userName: string;
    }>;
    verificationSummary: {
      approved: number;
      pending: number;
      rejected: number;
      total: number;
    };
  } | null>(null);

  React.useEffect(() => {
    return () => {
      if (copyResetRef.current) {
        clearTimeout(copyResetRef.current);
      }
    };
  }, []);

  const eventCode = React.useMemo(() => {
    if (!event) return "";
    try {
      return formatEventCode(generateEventCode(event.id));
    } catch (error) {
      console.error("Failed to generate event code", error);
      return "";
    }
  }, [event]);

  const shareUrl = React.useMemo(() => {
    if (!event) {
      return "";
    }

    const envBaseUrl = process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
      : "";
    const origin =
      envBaseUrl ||
      (typeof window !== "undefined" ? window.location.origin : "");
    const codeUrl = eventCode ? `${origin}/attendance?code=${eventCode}` : "";

    if (
      event.shortUrl &&
      !event.shortUrl.includes("192.168.") &&
      !event.shortUrl.includes("localhost") &&
      !event.shortUrl.includes("127.0.0.1")
    ) {
      return event.shortUrl;
    }

    if (codeUrl) {
      return codeUrl;
    }

    if (event.qrCodePayload) {
      return event.qrCodePayload;
    }

    if (origin) {
      return `${origin}/attendance/${event.id}`;
    }

    return `/attendance/${event.id}`;
  }, [event, eventCode]);

  const handleOpenShareUrl = React.useCallback(() => {
    if (!shareUrl) {
      toast({
        title: "No URL available",
        description: "Generate a QR code before opening the attendance form.",
      });
      return;
    }

    window.open(shareUrl, "_blank", "noopener,noreferrer");
  }, [shareUrl, toast]);

  const handleCopyShareUrl = React.useCallback(async () => {
    console.log("Copying URL:", shareUrl);

    if (!shareUrl) {
      toast({
        title: "No URL available",
        description: "Generate a QR code before copying the link.",
      });
      return;
    }

    const copyToClipboard = async (text: string) => {
      // Try using the Clipboard API first
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch (err) {
        console.warn("Clipboard API failed, trying fallback...", err);
      }

      // Fallback for older browsers or non-secure contexts
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;

        // Ensure the textarea is not visible but part of the DOM
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);

        textArea.focus();
        textArea.select();

        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);

        return successful;
      } catch (err) {
        console.error("Fallback copy failed", err);
        return false;
      }
    };

    try {
      const success = await copyToClipboard(shareUrl);

      if (success) {
        setCopied(true);

        if (copyResetRef.current) {
          clearTimeout(copyResetRef.current);
        }

        copyResetRef.current = setTimeout(() => {
          setCopied(false);
        }, 2000);

        toast({
          title: "Link copied",
          description: "Attendance link copied to clipboard.",
        });
      } else {
        throw new Error("Failed to copy to clipboard");
      }
    } catch (error) {
      console.error("Failed to copy attendance link", error);
      setCopied(false);
      toast({
        title: "Copy failed",
        description:
          "Could not copy link to clipboard. Please copy it manually.",
        variant: "destructive",
      });
    }
  }, [shareUrl, toast, copyResetRef]);

  // Use custom hook for print functionality (moved to shared hook to eliminate duplication)
  const { handlePrint: hookHandlePrint } = usePrintQRCode(
    event?.name || "",
    event?.qrCodeUrl || "",
    undefined,
    shareUrl,
    eventCode,
  );

  const handlePrintQrCode = React.useCallback(async () => {
    if (!event?.qrCodeUrl) {
      toast({
        title: "QR code unavailable",
        description: "Generate or refresh the QR code before printing.",
        variant: "destructive",
      });
      return;
    }
    await hookHandlePrint();
  }, [event?.qrCodeUrl, hookHandlePrint, toast]);

  React.useEffect(() => {
    let isMounted = true;

    async function fetchEventDetails(id: string) {
      setIsLoading(true);
      try {
        const [eventResult, attendanceResult] = await Promise.all([
          getEventById(id),
          getAttendanceMapData(id),
        ]);

        if (!eventResult.success || !eventResult.data) {
          throw new Error(eventResult.error || "Failed to load event details");
        }

        if (!isMounted) return;

        const data = eventResult.data;
        setEvent({
          id: data.id,
          name: data.name,
          description: data.description ?? null,
          startDateTime: data.startDateTime.toString(),
          endDateTime: data.endDateTime.toString(),
          venueName: data.venueName,
          venueAddress: data.venueAddress ?? null,
          campus: data.campus ?? "MainCampus",
          venueLatitude: data.venueLatitude,
          venueLongitude: data.venueLongitude,
          checkInBufferMins: data.checkInBufferMins,
          checkOutBufferMins: data.checkOutBufferMins,
          status: data.status,
          createdAt: data.createdAt.toString(),
          updatedAt: data.updatedAt.toString(),
          qrCodeUrl: data.qrCodeUrl ?? null,
          qrCodePayload: data.qrCodePayload ?? null,
          shortUrl: data.shortUrl ?? null,
          _count: data._count,
          createdBy: {
            id: data.User_Event_createdByIdToUser.id,
            firstName: data.User_Event_createdByIdToUser.firstName,
            lastName: data.User_Event_createdByIdToUser.lastName,
            email: data.User_Event_createdByIdToUser.email,
            role: data.User_Event_createdByIdToUser.role,
          },
        });

        // Set attendance map data if successful
        if (attendanceResult.success && attendanceResult.data) {
          setAttendanceMapData(attendanceResult.data);
        }
      } catch (error) {
        console.error("Failed to load event details", error);
        toast({
          title: "Unable to load event",
          description:
            error instanceof Error
              ? error.message
              : "Something went wrong while loading the event.",
          variant: "destructive",
        });
        if (isMounted) {
          setEvent(null);
          onOpenChange(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (open && eventId) {
      void fetchEventDetails(eventId);
    }

    if (!open) {
      setEvent(null);
      setAttendanceMapData(null);
    }

    return () => {
      isMounted = false;
    };
  }, [eventId, open, onOpenChange, toast]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!event) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      );
    }

    const startDate = new Date(event.startDateTime);
    const endDate = new Date(event.endDateTime);

    return (
      <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-4">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-2xl font-semibold">
                {event.name}
              </DialogTitle>
              <Badge variant={statusVariant[event.status] ?? "outline"}>
                {event.status}
              </Badge>
            </div>
            <DialogDescription>
              Overview of this event, including schedule, venue, and attendance
              summary.
            </DialogDescription>
          </div>

          {event.description && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Description
              </h3>
              <p className="text-sm leading-6 text-foreground/90 whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Schedule
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Starts</p>
                  <p className="font-medium">
                    {format(startDate, "MMMM d, yyyy • h:mm a")}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ends</p>
                  <p className="font-medium">
                    {format(endDate, "MMMM d, yyyy • h:mm a")}
                  </p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">
                      Check-in buffer
                    </p>
                    <p className="font-medium">
                      {event.checkInBufferMins} minutes
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">
                      Check-out buffer
                    </p>
                    <p className="font-medium">
                      {event.checkOutBufferMins} minutes
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Venue
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <p className="font-medium">{event.venueName}</p>
                  {event.venueAddress && (
                    <p className="text-xs text-muted-foreground">
                      {event.venueAddress}
                    </p>
                  )}
                </div>
                <Separator />
                <div>
                  <p className="text-muted-foreground">Campus</p>
                  <p className="font-medium">
                    {event.campus === "MainCampus" && "Main Campus"}
                    {event.campus === "MalimonoCampus" && "Malimono Campus"}
                    {event.campus === "MainitCampus" && "Mainit Campus"}
                    {event.campus === "ClaverCampus" && "Claver Campus"}
                    {event.campus === "DelCarmenCampus" && "Del Carmen Campus"}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">
                    Coordinates
                  </p>
                  <p className="font-medium">
                    {event.venueLatitude.toFixed(6)},{" "}
                    {event.venueLongitude.toFixed(6)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Attendance Snapshot
              </h3>
              {attendanceMapData ? (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Approved</span>
                    <Badge variant="default" className="bg-green-500">
                      {attendanceMapData.verificationSummary.approved}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Pending</span>
                    <Badge variant="secondary" className="bg-amber-500">
                      {attendanceMapData.verificationSummary.pending}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Rejected</span>
                    <Badge variant="destructive">
                      {attendanceMapData.verificationSummary.rejected}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-muted-foreground">Total</span>
                    <span>{attendanceMapData.verificationSummary.total}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Total submissions
                  </span>
                  <span className="font-semibold">
                    {event._count.Attendance}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Created By
              </h3>
              <div className="space-y-1 text-sm">
                <p className="font-medium">
                  {[event.createdBy.firstName, event.createdBy.lastName]
                    .filter(Boolean)
                    .join(" ") || event.createdBy.email}
                </p>
                <p className="text-muted-foreground text-xs">
                  {event.createdBy.email}
                </p>
                <p className="text-muted-foreground text-xs">
                  Role: {event.createdBy.role}
                </p>
                <Separator />
                <p className="text-muted-foreground text-xs">
                  Created {format(new Date(event.createdAt), "PPP p")}
                </p>
                <p className="text-muted-foreground text-xs">
                  Updated {format(new Date(event.updatedAt), "PPP p")}
                </p>
              </div>
            </div>
          </div>

          {attendanceMapData && attendanceMapData.attendances.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Attendee Locations
              </h3>
              <EventDetailMap
                venueLatitude={event.venueLatitude}
                venueLongitude={event.venueLongitude}
                venueName={event.venueName}
                attendances={attendanceMapData.attendances}
              />
            </div>
          )}

          {event.qrCodeUrl && (
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                QR Code
              </h3>
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <p>
                  Regenerating creates a brand-new QR code and invalidates any
                  previously shared copies.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!event) {
                      return;
                    }

                    const confirmed = window.confirm(
                      "Resetting the QR code will immediately invalidate the existing one. Continue?",
                    );

                    if (!confirmed) {
                      return;
                    }

                    startRegeneration(async () => {
                      const result = await regenerateQRCode(event.id);

                      if (!result.success || !result.data) {
                        toast({
                          title: "Failed to regenerate",
                          description:
                            result.error ||
                            "Something went wrong while regenerating the QR code.",
                          variant: "destructive",
                        });
                        return;
                      }

                      setEvent((previous) =>
                        previous
                          ? {
                              ...previous,
                              qrCodeUrl: result.data.qrCodeUrl ?? null,
                              qrCodePayload: result.data.qrCodePayload ?? null,
                              shortUrl: result.data.shortUrl ?? null,
                              updatedAt: result.data.regeneratedAt.toString(),
                            }
                          : previous,
                      );

                      toast({
                        title: "QR code regenerated",
                        description:
                          "Share the newly generated QR code with attendees.",
                      });
                    });
                  }}
                  disabled={
                    isRegenerating || (event?.status ?? "Active") !== "Active"
                  }
                >
                  {isRegenerating ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Regenerating…
                    </>
                  ) : (
                    <>
                      <RotateCcw className="mr-2 h-3.5 w-3.5" />
                      Reset QR Code
                    </>
                  )}
                </Button>
              </div>
              {event.status !== "Active" && (
                <p className="mt-1 text-xs text-destructive">
                  QR regeneration is only available while the event is active.
                </p>
              )}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Event Code
                  </p>
                </div>
                <div className="p-4 bg-muted rounded text-center">
                  <p className="text-3xl font-bold font-mono tracking-widest select-all text-primary">
                    {formatEventCode(generateEventCode(event.id))}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Users can enter this code at /attendance to access this
                    event
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Attendance Link
                  </p>
                  {copied && (
                    <span className="text-xs text-emerald-600">Copied!</span>
                  )}
                </div>
                {event.shortUrl &&
                  !event.shortUrl.includes("192.168.") &&
                  !event.shortUrl.includes("localhost") &&
                  !event.shortUrl.includes("127.0.0.1") && (
                    <div className="mb-2 p-2 bg-muted rounded text-center">
                      <p className="text-xs text-muted-foreground mb-1">
                        Manual Entry URL
                      </p>
                      <p className="text-sm font-bold select-all text-primary">
                        {event.shortUrl}
                      </p>
                    </div>
                  )}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="grid grid-cols-3 gap-2 w-full">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleOpenShareUrl}
                      disabled={!shareUrl}
                      aria-label="Open attendance form in a new tab"
                    >
                      <ExternalLink className="mr-1.5 h-4 w-4" />
                      Open
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyShareUrl}
                      disabled={!shareUrl}
                      aria-label="Copy attendance link to clipboard"
                    >
                      {copied ? (
                        <Check className="mr-1.5 h-4 w-4" />
                      ) : (
                        <Copy className="mr-1.5 h-4 w-4" />
                      )}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handlePrintQrCode}
                      disabled={!event.qrCodeUrl}
                      aria-label="Print QR code"
                    >
                      <Printer className="mr-1.5 h-4 w-4" />
                      Print
                    </Button>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={event.qrCodeUrl}
                  alt={`QR code for ${event.name}`}
                  className="h-40 w-40 rounded border"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Event details
          </DialogTitle>
          <DialogDescription>
            Detailed information for the selected event.
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
