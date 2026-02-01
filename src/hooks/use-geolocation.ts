"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface GeolocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
}

type PermissionState = "prompt" | "granted" | "denied" | "unknown";

interface UseGeolocationReturn {
  coords: GeolocationCoords | null;
  error: string | null;
  errorCode: number | null;
  loading: boolean;
  permissionState: PermissionState;
  requestPermission: () => void;
  clearError: () => void;
}

/**
 * Detect if user is on a mobile device
 */
function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  const windowWithOpera = window as Window & { opera?: string };
  const userAgent =
    navigator.userAgent || navigator.vendor || windowWithOpera.opera || "";
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    userAgent.toLowerCase(),
  );
}

/**
 * Detect specific browser for tailored troubleshooting
 */
function detectBrowser(): string {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("brave")) return "brave";
  if (ua.includes("chrome") && !ua.includes("edg")) return "chrome";
  if (ua.includes("firefox")) return "firefox";
  if (ua.includes("safari") && !ua.includes("chrome")) return "safari";
  if (ua.includes("edg")) return "edge";
  if (ua.includes("samsung")) return "samsung";
  return "default";
}

/**
 * Generate helpful error message based on error code and browser
 */
function getErrorMessage(
  errorCode: number,
  browser: string,
  isMobile: boolean,
): string {
  const browserName =
    {
      brave: "Brave",
      chrome: "Chrome",
      firefox: "Firefox",
      safari: "Safari",
      edge: "Edge",
      samsung: "Samsung Internet",
      default: "your browser",
    }[browser] || "your browser";

  switch (errorCode) {
    case 1: // PERMISSION_DENIED
      if (isMobile) {
        return `Location permission was denied. To fix this:\n\n1. Check your phone's Settings → Location is ON\n2. In ${browserName}, go to Site Settings → Location and allow this site\n3. Tap "Try Again" below`;
      }
      return `Location permission denied. Please allow location access in ${browserName} settings and try again.`;

    case 2: // POSITION_UNAVAILABLE
      if (isMobile) {
        return `Unable to determine your location. Please try:\n\n1. Make sure GPS/Location is enabled in your phone settings\n2. Go outside or near a window for better GPS signal\n3. Wait a few seconds and tap "Try Again"`;
      }
      return "Location unavailable. Please enable location services on your device and ensure you have internet connectivity.";

    case 3: // TIMEOUT
      if (isMobile) {
        return `Location request timed out. This can happen if GPS signal is weak. Please:\n\n1. Make sure you're in an area with good GPS reception\n2. Wait a moment for GPS to initialize\n3. Tap "Try Again"`;
      }
      return "Location request timed out. Please ensure location services are enabled and try again.";

    default:
      return "An unknown error occurred while getting your location. Please try again.";
  }
}

/**
 * Custom hook for accessing device geolocation with improved mobile support
 *
 * Key improvements:
 * - Uses watchPosition for progressive accuracy updates
 * - Implements fallback strategy: tries high accuracy first, then low accuracy
 * - Better error messages with browser-specific troubleshooting
 * - Handles Android browser quirks
 * - Permission state tracking
 *
 * @returns Current GPS coordinates, error state, loading state, and permission request function
 */
export function useGeolocation(): UseGeolocationReturn {
  const [coords, setCoords] = useState<GeolocationCoords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [permissionState, setPermissionState] =
    useState<PermissionState>("unknown");

  const watchIdRef = useRef<number | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasReceivedPosition = useRef(false);
  const fallbackAttempted = useRef(false);

  // Check and track permission state
  useEffect(() => {
    if (typeof window === "undefined" || !("permissions" in navigator)) {
      return;
    }

    let permissionStatus: PermissionStatus | null = null;

    const checkPermission = async () => {
      try {
        permissionStatus = await navigator.permissions.query({
          name: "geolocation" as PermissionName,
        });

        setPermissionState(permissionStatus.state as PermissionState);

        // Listen for permission changes
        const handleChange = () => {
          if (permissionStatus) {
            setPermissionState(permissionStatus.state as PermissionState);
          }
        };

        permissionStatus.addEventListener("change", handleChange);

        return () => {
          permissionStatus?.removeEventListener("change", handleChange);
        };
      } catch (err) {
        // Permission API might not be fully supported
        console.warn("Permission API not fully supported:", err);
        setPermissionState("unknown");
      }
    };

    checkPermission();
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timeoutIdRef.current !== null) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const clearError = useCallback(() => {
    setError(null);
    setErrorCode(null);
  }, []);

  const requestPermission = useCallback(() => {
    // Don't start a new request if already loading
    if (loading) return;

    // Check basic support
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setErrorCode(-1);
      return;
    }

    // Check secure context (HTTPS)
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError(
        "Geolocation requires HTTPS. Please access this site via HTTPS.",
      );
      setErrorCode(-2);
      return;
    }

    // Clean up any existing watch
    cleanup();

    // Reset state
    setLoading(true);
    setError(null);
    setErrorCode(null);
    hasReceivedPosition.current = false;
    fallbackAttempted.current = false;

    const isMobile = isMobileDevice();
    const browser = detectBrowser();

    // Success handler - called when we get a position
    const handleSuccess = (position: GeolocationPosition) => {
      // Only update if this is better accuracy or first position
      const newAccuracy = position.coords.accuracy;
      const currentAccuracy = coords?.accuracy ?? Infinity;

      // For mobile, accept any position on first try, then only better accuracy
      if (!hasReceivedPosition.current || newAccuracy < currentAccuracy) {
        hasReceivedPosition.current = true;

        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });

        // If we got good accuracy (under 100m), we can stop watching
        if (newAccuracy <= 100) {
          cleanup();
          setLoading(false);
        }
      }

      // Always stop loading once we have any position
      if (hasReceivedPosition.current) {
        setLoading(false);
      }
    };

    // Error handler
    // Normalize geolocation error for consistent logging across browsers
    const toErrorInfo = (
      err: unknown,
    ): { code: number | null; message: string } => {
      if (err && typeof err === "object") {
        const anyErr = err as {
          code?: unknown;
          message?: unknown;
          name?: unknown;
        };
        const code = typeof anyErr.code === "number" ? anyErr.code : null;
        const message =
          typeof anyErr.message === "string"
            ? anyErr.message
            : JSON.stringify(anyErr);
        return { code, message };
      }
      return { code: null, message: String(err) };
    };

    const handleError = (err: GeolocationPositionError | unknown) => {
      const info = toErrorInfo(err);
      const code = info.code;

      // Use clearer, string-based logging to avoid empty object prints
      if (code === 1) {
        // Permission denied – expected user action; warn instead of hard error
        console.warn(
          `Geolocation permission denied (code=1). Browser=${browser}, mobile=${isMobile}`,
        );
      } else {
        console.error(
          `Geolocation error (code=${code ?? "unknown"}): ${info.message}. Browser=${browser}, mobile=${isMobile}`,
        );
      }

      // If high accuracy failed and we haven't tried fallback, try low accuracy
      if (
        (code === 2 || code === 3) &&
        !fallbackAttempted.current &&
        !hasReceivedPosition.current
      ) {
        fallbackAttempted.current = true;
        console.log("Attempting low accuracy fallback...");

        // Try with low accuracy (uses Wi-Fi/cell tower positioning)
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          (fallbackErr) => {
            const info = toErrorInfo(fallbackErr);
            const code = info.code ?? 0;
            // Both attempts failed
            const errorMessage = getErrorMessage(code, browser, isMobile);
            setError(errorMessage);
            setErrorCode(code);
            setLoading(false);
            cleanup();
          },
          {
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 60000, // Accept cached position up to 1 minute old
          },
        );
        return;
      }

      // If we already have a position, don't show error (just less accurate)
      if (hasReceivedPosition.current) {
        setLoading(false);
        cleanup();
        return;
      }

      const effectiveCode = info.code ?? 0;
      const errorMessage = getErrorMessage(effectiveCode, browser, isMobile);
      setError(errorMessage);
      setErrorCode(effectiveCode);
      setLoading(false);
      cleanup();
    };

    // Geolocation options - optimized for mobile
    // Using watchPosition instead of getCurrentPosition for better mobile support
    // watchPosition can get progressively more accurate positions
    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: isMobile ? 30000 : 15000, // Longer timeout for mobile GPS
      maximumAge: 0, // We want fresh position data
    };

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      options,
    );

    // Set a maximum time limit for the entire process
    const maxWaitTime = isMobile ? 45000 : 20000;
    timeoutIdRef.current = setTimeout(() => {
      if (!hasReceivedPosition.current) {
        // Final timeout - no position received at all
        const errorMessage = getErrorMessage(3, browser, isMobile); // Timeout error
        setError(errorMessage);
        setErrorCode(3);
        setLoading(false);
        cleanup();
      } else {
        // We have a position, just stop trying to improve it
        setLoading(false);
        cleanup();
      }
    }, maxWaitTime);
  }, [loading, coords?.accuracy, cleanup]);

  return {
    coords,
    error,
    errorCode,
    loading,
    permissionState,
    requestPermission,
    clearError,
  };
}

/**
 * Custom hook to detect if user is on a mobile device
 * @returns Boolean indicating if device is mobile
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const windowWithOpera = window as Window & { opera?: string };
    const userAgent =
      navigator.userAgent || navigator.vendor || windowWithOpera.opera || "";

    const isMobileDevice =
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent.toLowerCase(),
      );

    const isSmallScreen = window.matchMedia
      ? window.matchMedia("(max-width: 768px)").matches
      : window.innerWidth <= 768;

    setIsMobile(isMobileDevice || isSmallScreen);
  }, []);

  return isMobile;
}
