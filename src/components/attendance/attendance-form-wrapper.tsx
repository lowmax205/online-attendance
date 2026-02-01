"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Logo } from "@/components/logo";
import { LocationVerifier } from "./location-verifier";
import { CameraCapture } from "./camera-capture";
import { SignatureCanvasComponent } from "./signature-canvas";
import { DeviceAccessControl } from "./device-access-control";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PenLine,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { submitAttendance } from "@/actions/attendance/submit";
import { z } from "zod";

// Form validation schema
const attendanceFormSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  attendanceType: z.enum(["check-in", "check-out"]),
  latitude: z.number(),
  longitude: z.number(),
  frontPhoto: z.string().min(1, "Front photo is required"),
  backPhoto: z.string().min(1, "Back photo is required"),
  signature: z.string().min(1, "Signature is required"),
});

type AttendanceFormData = z.infer<typeof attendanceFormSchema>;

const STEPS = [
  { id: 1, name: "Verify Location", description: "Confirm your location" },
  { id: 2, name: "Front Photo", description: "Take your front photo" },
  { id: 3, name: "Back Photo", description: "Take your back photo" },
  { id: 4, name: "Signature", description: "Sign digitally" },
  { id: 5, name: "Review & Submit", description: "Review and submit" },
];

interface EventData {
  id: string;
  name: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  venueName: string;
  venueAddress: string;
  venueLatitude: number;
  venueLongitude: number;
}

interface AttendanceFormWrapperProps {
  event: EventData;
  attendanceType: "check-in" | "check-out";
  userRole: "student" | "moderator" | "admin";
}

export function AttendanceFormWrapper({
  event,
  attendanceType,
  userRole,
}: AttendanceFormWrapperProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [frontCameraOpen, setFrontCameraOpen] = useState(false);
  const [backCameraOpen, setBackCameraOpen] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);

  // Location verification state
  const [locationVerified, setLocationVerified] = useState(false);
  const [isWithinRange, setIsWithinRange] = useState(false);
  const [userLatitude, setUserLatitude] = useState<number | undefined>();
  const [userLongitude, setUserLongitude] = useState<number | undefined>();

  const form = useForm<AttendanceFormData>({
    resolver: zodResolver(attendanceFormSchema),
    defaultValues: {
      eventId: event.id,
      attendanceType: attendanceType,
      latitude: 0,
      longitude: 0,
      frontPhoto: "",
      backPhoto: "",
      signature: "",
    },
  });

  // Handle location verification (called when user clicks "Verify Location")
  const handleLocationVerified = (
    lat: number,
    lng: number,
    distance: number,
  ) => {
    form.setValue("latitude", lat);
    form.setValue("longitude", lng);
    setLocationVerified(true);
    toast.success(`Location verified (${distance.toFixed(0)}m from venue)`);
  };

  // Handle location ready state (called when location is obtained)
  const handleLocationVerify = (
    withinRange: boolean,
    lat?: number,
    lng?: number,
  ) => {
    setIsWithinRange(withinRange);
    if (lat !== undefined) setUserLatitude(lat);
    if (lng !== undefined) setUserLongitude(lng);
  };

  // Handle Next button on Step 1
  const handleLocationNext = () => {
    if (locationVerified && isWithinRange) {
      setCurrentStep(2);
    }
  };

  // Handle photo capture
  const handleFrontPhoto = (photo: string) => {
    form.setValue("frontPhoto", photo);
    setFrontCameraOpen(false);
    setCurrentStep(3);
  };

  const handleBackPhoto = (photo: string) => {
    form.setValue("backPhoto", photo);
    setBackCameraOpen(false);
    setCurrentStep(4);
  };

  // Handle signature
  const handleSignature = (signature: string) => {
    form.setValue("signature", signature);
  };

  // Handle form submission
  const onSubmit = async (data: AttendanceFormData) => {
    setIsSubmitting(true);

    try {
      console.log("Submitting attendance with data:", {
        eventId: data.eventId,
        attendanceType: data.attendanceType,
        latitude: data.latitude,
        longitude: data.longitude,
        frontPhotoLength: data.frontPhoto?.length,
        backPhotoLength: data.backPhoto?.length,
        signatureLength: data.signature?.length,
      });

      const result = await submitAttendance({
        eventId: data.eventId,
        attendanceType: data.attendanceType,
        latitude: data.latitude,
        longitude: data.longitude,
        frontPhotoBase64: data.frontPhoto,
        backPhotoBase64: data.backPhoto,
        signatureBase64: data.signature,
      });

      console.log("Submission result:", result);

      if (!result.success) {
        // Display detailed validation errors if available
        const errorDetails = "details" in result ? result.details : undefined;
        const detailsMessage = errorDetails
          ? (errorDetails as Array<{ field: string; message: string }>)
              .map((d) => `${d.field}: ${d.message}`)
              .join("\n")
          : "Please try again or contact support if the issue persists.";

        toast.error(result.error || "Failed to submit attendance", {
          description: detailsMessage,
          action: {
            label: "Retry",
            onClick: () => onSubmit(data),
          },
        });
        return;
      }

      toast.success("Attendance submitted successfully!");
      router.push(`/attendance/${data.eventId}/success`);
    } catch (error) {
      console.error("Attendance submission error:", error);
      toast.error("Failed to submit attendance", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        action: {
          label: "Retry",
          onClick: () => onSubmit(data),
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navigation helpers
  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <DeviceAccessControl userRole={userRole} requireMobile={true}>
      <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Logo href="/" size="lg" />
        </div>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{event.name}</h1>
          <p className="text-muted-foreground">{event.description}</p>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={attendanceType === "check-in" ? "default" : "secondary"}
              className="text-sm font-semibold"
            >
              {attendanceType === "check-in" ? "CHECK-IN" : "CHECK-OUT"}
            </Badge>
            <Badge variant="outline">{event.venueName}</Badge>
            <Badge variant="outline">
              {new Date(event.startDateTime).toLocaleDateString()}
            </Badge>
          </div>
        </div>

        {/* Attendance Type Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {attendanceType === "check-in" ? (
              <span>
                You are <strong>checking in</strong> to this event. Complete all
                steps to mark your arrival.
              </span>
            ) : (
              <span>
                You are <strong>checking out</strong> from this event. Complete
                all steps to mark your departure.
              </span>
            )}
          </AlertDescription>
        </Alert>

        {/* Progress Indicator */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Step {currentStep} of {STEPS.length}:{" "}
              {STEPS[currentStep - 1].name}
            </CardTitle>
            <CardDescription>
              {STEPS[currentStep - 1].description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        {/* Step Content */}
        <Card>
          <CardContent className="pt-6">
            {/* Step 1: Location Verification */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <LocationVerifier
                  venueLat={event.venueLatitude}
                  venueLon={event.venueLongitude}
                  venueName={event.venueName}
                  onVerified={handleLocationVerified}
                  onLocationReady={handleLocationVerify}
                />
                {/* Next button - disabled if not verified or not within range */}
                {userLatitude && userLongitude && (
                  <div className="flex justify-center pt-4">
                    <Button
                      onClick={handleLocationNext}
                      disabled={!locationVerified || !isWithinRange}
                      size="lg"
                      className="w-full max-w-md"
                    >
                      {!isWithinRange ? (
                        <>Move Closer to Venue</>
                      ) : !locationVerified ? (
                        <>Verify Location First</>
                      ) : (
                        <>
                          Next
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Front Photo */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Take a clear front-facing photo. Make sure your face is
                    visible and well-lit.
                  </AlertDescription>
                </Alert>
                {form.watch("frontPhoto") ? (
                  <div className="space-y-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.watch("frontPhoto")}
                      alt="Front photo"
                      className="w-full max-w-md mx-auto rounded-lg border"
                    />
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setFrontCameraOpen(true)}
                      >
                        Retake Photo
                      </Button>
                      <Button onClick={() => setCurrentStep(3)}>
                        Continue
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <Button onClick={() => setFrontCameraOpen(true)} size="lg">
                      Take Front Photo
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Back Photo */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Take a back-facing photo showing the event venue or
                    surrounding area.
                  </AlertDescription>
                </Alert>
                {form.watch("backPhoto") ? (
                  <div className="space-y-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.watch("backPhoto")}
                      alt="Back photo"
                      className="w-full max-w-md mx-auto rounded-lg border"
                    />
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setBackCameraOpen(true)}
                      >
                        Retake Photo
                      </Button>
                      <Button onClick={() => setCurrentStep(4)}>
                        Continue
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <Button onClick={() => setBackCameraOpen(true)} size="lg">
                      Take Back Photo
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Signature */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Sign your name in the box below to confirm your attendance.
                  </AlertDescription>
                </Alert>

                {/* Show signature preview or button to open dialog */}
                {form.watch("signature") ? (
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-2">
                        Your Signature:
                      </p>
                      <Image
                        src={form.watch("signature")}
                        alt="Your signature"
                        width={200}
                        height={128}
                        className="max-h-32 mx-auto"
                        unoptimized
                      />
                    </div>
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setSignatureDialogOpen(true)}
                      >
                        Change Signature
                      </Button>
                      <Button onClick={() => setCurrentStep(5)}>
                        Continue
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <Button onClick={() => setSignatureDialogOpen(true)}>
                      <PenLine className="mr-2 h-4 w-4" />
                      Add Signature
                    </Button>
                  </div>
                )}

                <SignatureCanvasComponent
                  open={signatureDialogOpen}
                  onOpenChange={setSignatureDialogOpen}
                  onSignature={handleSignature}
                  value={form.watch("signature")}
                />
              </div>
            )}

            {/* Step 5: Review & Submit */}
            {currentStep === 5 && (
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Review your attendance submission before submitting.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Event Details</h3>
                    <p className="text-sm text-muted-foreground">
                      {event.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {event.venueName}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Location</h3>
                    <p className="text-sm text-muted-foreground">
                      Latitude: {form.watch("latitude").toFixed(6)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Longitude: {form.watch("longitude").toFixed(6)}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Photos</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Front Photo</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={form.watch("frontPhoto")}
                          alt="Front"
                          className="w-full rounded-lg border"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Back Photo</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={form.watch("backPhoto")}
                          alt="Back"
                          className="w-full rounded-lg border"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Signature</h3>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.watch("signature")}
                      alt="Signature"
                      className="w-full rounded-lg border bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goToPreviousStep}
                    disabled={isSubmitting}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Submit Attendance
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        {currentStep > 1 && currentStep < 5 && (
          <div className="flex justify-between">
            <Button variant="outline" onClick={goToPreviousStep}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        )}

        {/* Camera Modals */}
        <CameraCapture
          open={frontCameraOpen}
          onOpenChange={setFrontCameraOpen}
          onCapture={handleFrontPhoto}
          title="Take Front Photo"
          description="Take a clear front-facing photo. Make sure your face is visible and well-lit."
          facingMode="user"
        />
        <CameraCapture
          open={backCameraOpen}
          onOpenChange={setBackCameraOpen}
          onCapture={handleBackPhoto}
          title="Take Back Photo"
          description="Take a back-facing photo showing the event venue or surrounding area."
          facingMode="environment"
        />
      </div>
    </DeviceAccessControl>
  );
}
