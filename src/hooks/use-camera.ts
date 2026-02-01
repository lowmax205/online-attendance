"use client";

import { useEffect, useRef, useState } from "react";

interface UseCameraReturn {
  stream: MediaStream | null;
  error: string | null;
  requestPermission: () => Promise<void>;
  capture: () => Promise<string | null>;
  stopCamera: () => void;
}

/**
 * Custom hook for accessing device camera via MediaDevices API
 * @param facingMode - Camera direction: 'user' (front) or 'environment' (rear)
 * @returns Camera stream, error state, permission function, and capture function
 */
export function useCamera(
  facingMode: "user" | "environment" = "environment",
): UseCameraReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    // Cleanup stream on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const requestPermission = async (): Promise<void> => {
    try {
      setError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera is not supported by your browser");
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);
    } catch (err) {
      let errorMessage = "Failed to access camera";

      if (err instanceof Error) {
        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError"
        ) {
          errorMessage =
            "Camera permission denied. Please enable camera access in your browser settings.";
        } else if (
          err.name === "NotFoundError" ||
          err.name === "DevicesNotFoundError"
        ) {
          errorMessage = "No camera found on this device.";
        } else if (
          err.name === "NotReadableError" ||
          err.name === "TrackStartError"
        ) {
          errorMessage = "Camera is already in use by another application.";
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
    }
  };

  const capture = async (): Promise<string | null> => {
    if (!stream) {
      setError("No camera stream available");
      return null;
    }

    try {
      // Create a video element if not already created
      if (!videoRef.current) {
        videoRef.current = document.createElement("video");
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
      }

      // Create canvas and capture frame
      const canvas = document.createElement("canvas");
      const video = videoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Failed to get canvas context");
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to base64 JPEG
      const base64Image = canvas.toDataURL("image/jpeg", 0.9);
      return base64Image;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to capture image";
      setError(errorMessage);
      return null;
    }
  };

  const stopCamera = (): void => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }
  };

  return {
    stream,
    error,
    requestPermission,
    capture,
    stopCamera,
  };
}
