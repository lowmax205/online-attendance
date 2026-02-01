"use client";

import { useCamera } from "@/hooks/use-camera";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, RotateCcw, Check, AlertCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface CameraCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (base64Image: string) => void;
  title: string;
  description: string;
  facingMode?: "user" | "environment";
}

/**
 * Camera capture dialog component
 * Captures photos and returns base64 image
 */
export function CameraCapture({
  open,
  onOpenChange,
  onCapture,
  title,
  description,
  facingMode = "environment",
}: CameraCaptureProps) {
  const { stream, error, requestPermission, capture, stopCamera } =
    useCamera(facingMode);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Setup video stream when component mounts or stream changes
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
  }, [stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleOpenChange = async (newOpen: boolean) => {
    if (newOpen) {
      setCapturedImage(null);
      await requestPermission();
    } else {
      stopCamera();
      setCapturedImage(null);
    }
    onOpenChange(newOpen);
  };

  const handleCapture = async () => {
    const image = await capture();
    if (image) {
      setCapturedImage(image);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      handleOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-2xl"
        aria-describedby="camera-description"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription id="camera-description">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera permission error */}
          {error && (
            <Alert variant="destructive" role="alert" aria-live="assertive">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Video preview or captured image */}
          <div
            className="relative aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 overflow-hidden"
            role="region"
            aria-label={
              capturedImage ? "Captured photo preview" : "Live camera feed"
            }
          >
            {capturedImage ? (
              // Show captured image
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capturedImage}
                  alt="Captured photo for attendance verification"
                  className="w-full h-full object-cover"
                />
              </>
            ) : stream ? (
              // Show live camera feed
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                aria-label="Live camera viewfinder"
              />
            ) : (
              // Placeholder
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <Camera
                  className="h-16 w-16 text-muted-foreground/50"
                  aria-hidden="true"
                />
                <p className="text-sm text-muted-foreground">
                  Camera not active
                </p>
              </div>
            )}
          </div>

          {/* Accessibility hints */}
          <div
            className="text-xs text-muted-foreground space-y-1"
            role="status"
          >
            <p>• Ensure good lighting for clear photos</p>
            <p>• Hold the camera steady</p>
            <p>• Make sure the subject fills the frame</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            aria-label="Cancel photo capture"
          >
            Cancel
          </Button>

          {!capturedImage && stream && (
            <Button
              onClick={handleCapture}
              aria-label="Capture photo from camera"
            >
              <Camera className="mr-2 h-4 w-4" aria-hidden="true" />
              Capture Photo
            </Button>
          )}

          {capturedImage && (
            <>
              <Button
                variant="outline"
                onClick={handleRetake}
                aria-label="Retake photo"
              >
                <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                Retake
              </Button>
              <Button
                onClick={handleConfirm}
                aria-label="Confirm and use this photo"
              >
                <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                Use This Photo
              </Button>
            </>
          )}

          {!capturedImage && !stream && !error && (
            <Button
              onClick={requestPermission}
              aria-label="Enable camera access"
            >
              <Camera className="mr-2 h-4 w-4" aria-hidden="true" />
              Enable Camera
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
