"use client";

import { useGeolocation } from "@/hooks/use-geolocation";
import { calculateDistance } from "@/lib/geolocation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  MapPin,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Settings,
  Smartphone,
  Wifi,
  AlertTriangle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// Center of the Philippines (approximately)
const PHILIPPINES_CENTER: [number, number] = [122.5621, 12.8797];

// Helper function to convert meters to pixels at max zoom
function metersToPixelsAtMaxZoom(meters: number, latitude: number) {
  return meters / 0.075 / Math.cos((latitude * Math.PI) / 180);
}

interface LocationVerifierProps {
  venueLat: number;
  venueLon: number;
  venueName: string;
  onVerified: (latitude: number, longitude: number, distance: number) => void;
  onLocationReady?: (
    isWithinRange: boolean,
    latitude?: number,
    longitude?: number,
    distance?: number,
  ) => void;
}

export function LocationVerifier({
  venueLat,
  venueLon,
  venueName,
  onVerified,
  onLocationReady,
}: LocationVerifierProps) {
  const {
    coords,
    error,
    loading,
    permissionState,
    requestPermission,
    clearError,
  } = useGeolocation();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const venueMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [manuallyVerified, setManuallyVerified] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  // Calculate distance when coordinates are available
  const distance = coords
    ? calculateDistance(coords.latitude, coords.longitude, venueLat, venueLon)
    : null;

  const isWithinRange = distance !== null && distance <= 100;

  // Notify parent of location readiness
  useEffect(() => {
    if (onLocationReady && coords) {
      onLocationReady(
        isWithinRange,
        coords.latitude,
        coords.longitude,
        distance ?? undefined,
      );
    }
  }, [onLocationReady, coords, isWithinRange, distance]);

  // Initialize map - start at Philippines center
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: PHILIPPINES_CENTER,
        zoom: 5.5,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

      // Add venue marker (red)
      venueMarker.current = new mapboxgl.Marker({ color: "#ef4444" })
        .setLngLat([venueLon, venueLat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2">
              <strong>${venueName}</strong>
              <p class="text-sm text-gray-600">Event Venue</p>
            </div>`,
          ),
        )
        .addTo(map.current);

      // Draw 100m radius circle around venue
      map.current.on("load", () => {
        if (!map.current) return;

        // Add circle source and layer
        map.current.addSource("venue-radius", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [venueLon, venueLat],
            },
          },
        });

        // Add circle layer (100m radius)
        map.current.addLayer({
          id: "venue-circle",
          type: "circle",
          source: "venue-radius",
          paint: {
            "circle-radius": {
              stops: [
                [0, 0],
                [20, metersToPixelsAtMaxZoom(100, venueLat)],
              ],
              base: 2,
            },
            "circle-color": "#22c55e",
            "circle-opacity": 0.1,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#22c55e",
            "circle-stroke-opacity": 0.8,
          },
        });

        setMapInitialized(true);
      });
    } catch (error) {
      console.error("Error initializing map:", error);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [venueLat, venueLon, venueName]);

  // Update user marker and animate map when coordinates change
  useEffect(() => {
    if (!map.current || !coords || !mapInitialized) return;

    // Remove old user marker if exists
    if (userMarker.current) {
      userMarker.current.remove();
    }

    // Add new user marker (blue)
    userMarker.current = new mapboxgl.Marker({ color: "#3b82f6" })
      .setLngLat([coords.longitude, coords.latitude])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<div class="p-2">
            <strong>Your Location</strong>
            <p class="text-sm text-gray-600">
              ${distance !== null ? `${distance.toFixed(1)}m from venue` : ""}
            </p>
          </div>`,
        ),
      )
      .addTo(map.current);

    // Animate from Philippines center to user location (only once)
    if (!hasAnimated) {
      setHasAnimated(true);

      // First fly to user location
      map.current.flyTo({
        center: [coords.longitude, coords.latitude],
        zoom: 16,
        duration: 2500,
        essential: true,
      });

      // After arriving at user location, fit bounds to show both markers
      setTimeout(() => {
        if (!map.current) return;

        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([venueLon, venueLat]);
        bounds.extend([coords.longitude, coords.latitude]);

        map.current.fitBounds(bounds, {
          padding: 80,
          maxZoom: 19,
          duration: 1500,
        });
      }, 2600);
    }
  }, [coords, venueLat, venueLon, distance, mapInitialized, hasAnimated]);

  // Handle manual verification
  const handleVerifyLocation = () => {
    if (coords && distance !== null && isWithinRange) {
      setManuallyVerified(true);
      onVerified(coords.latitude, coords.longitude, distance);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location Verification
        </CardTitle>
        <CardDescription>Verify you are at {venueName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Instruction alert - show when no coords and not loading */}
        {!coords && !loading && !error && (
          <Alert>
            <MapPin className="h-4 w-4" />
            <AlertDescription>
              <strong>Step 1:</strong> Click the button below to enable location
              access. Your browser will ask for permission - please tap{" "}
              <strong>&quot;Allow&quot;</strong>.
            </AlertDescription>
          </Alert>
        )}

        {/* Permission denied warning */}
        {permissionState === "denied" && !loading && !coords && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Location Permission Blocked</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                Location access has been blocked for this site. To fix this:
              </p>
              <ol className="list-decimal ml-4 mt-2 space-y-1 text-sm">
                <li>
                  Tap the <Settings className="inline h-3 w-3" /> lock/settings
                  icon in your browser&apos;s address bar
                </li>
                <li>
                  Find &quot;Location&quot; and change it to &quot;Allow&quot;
                </li>
                <li>Refresh the page and try again</li>
              </ol>
            </AlertDescription>
          </Alert>
        )}

        {/* Error state with detailed troubleshooting */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Location Error</AlertTitle>
            <AlertDescription className="whitespace-pre-line">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Troubleshooting section - show after errors */}
        {error && (
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTroubleshoot(!showTroubleshoot)}
              className="text-muted-foreground"
            >
              {showTroubleshoot ? "Hide" : "Show"} troubleshooting tips
            </Button>

            {showTroubleshoot && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3 text-sm">
                <h4 className="font-semibold flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Mobile Device Checklist
                </h4>
                <ul className="space-y-2 ml-6 list-disc">
                  <li>
                    <strong>GPS/Location Services:</strong> Go to your
                    phone&apos;s Settings → Location and make sure it&apos;s
                    turned ON
                  </li>
                  <li>
                    <strong>High Accuracy Mode:</strong> On Android, enable
                    &quot;High accuracy&quot; or &quot;GPS, Wi-Fi, and mobile
                    networks&quot; mode
                  </li>
                  <li>
                    <strong>Browser Permission:</strong> Check your
                    browser&apos;s site settings and allow location for this
                    website
                  </li>
                  <li>
                    <strong>Signal Strength:</strong> If you&apos;re indoors,
                    try moving near a window or go outside for better GPS signal
                  </li>
                </ul>

                <h4 className="font-semibold flex items-center gap-2 mt-4">
                  <Wifi className="h-4 w-4" />
                  Alternative: Use Network Location
                </h4>
                <p className="text-muted-foreground">
                  If GPS isn&apos;t working, make sure you have an active
                  internet connection. The system can use Wi-Fi or mobile data
                  to estimate your location.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-sm font-medium">Getting your location...</p>
              <p className="text-xs text-muted-foreground mt-1">
                {coords
                  ? `Current accuracy: ±${Math.round(coords.accuracy)}m - improving...`
                  : "This may take up to 30 seconds on mobile devices"}
              </p>
            </div>
          </div>
        )}

        {/* Success state - within range */}
        {isWithinRange && distance !== null && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              ✓ You are {distance.toFixed(1)}m from the venue (within 100m
              range)
              {!manuallyVerified && " - Click 'Verify Location' to proceed"}
            </AlertDescription>
          </Alert>
        )}

        {/* Error state - outside range */}
        {distance !== null && distance > 100 && (
          <div className="space-y-3">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                You are {distance.toFixed(1)}m from the venue. Please move
                closer (max 100m).
              </AlertDescription>
            </Alert>
            <Button
              onClick={requestPermission}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Retry Location
            </Button>
          </div>
        )}

        {/* Map Visualization - Always visible */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Location Map</h3>
          <div
            ref={mapContainer}
            className="w-full h-[350px] rounded-lg border overflow-hidden bg-muted"
            style={{ minHeight: "350px" }}
          />
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Your Location</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Event Venue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-green-500" />
              <span>100m Radius</span>
            </div>
          </div>
        </div>

        {/* Location details */}
        {coords && (
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Your Location:</span>
              <span className="font-mono">
                {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Accuracy:</span>
              <span>±{coords.accuracy.toFixed(0)}m</span>
            </div>
            {distance !== null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Distance to Venue:
                </span>
                <span
                  className={
                    distance <= 100
                      ? "text-green-600 font-semibold"
                      : "text-red-600 font-semibold"
                  }
                >
                  {distance.toFixed(1)}m
                </span>
              </div>
            )}
          </div>
        )}

        {/* Verify Location button - only show when within range and not verified */}
        {coords && isWithinRange && !manuallyVerified && (
          <Button onClick={handleVerifyLocation} className="w-full" size="lg">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Verify Location
          </Button>
        )}

        {/* Request permission button - show prominently when no coords */}
        {!coords && !loading && !error && (
          <Button onClick={requestPermission} className="w-full" size="lg">
            <MapPin className="mr-2 h-4 w-4" />
            Enable Location Access
          </Button>
        )}

        {/* Retry button on error - make it primary and prominent */}
        {error && (
          <Button
            onClick={() => {
              clearError();
              setShowTroubleshoot(false);
              requestPermission();
            }}
            className="w-full"
            size="lg"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        )}

        {/* Accessibility hint */}
        <p className="text-xs text-muted-foreground text-center">
          {coords
            ? `GPS accuracy: ±${Math.round(coords.accuracy)}m`
            : "GPS accuracy may vary. Ensure location services are enabled."}
        </p>
      </CardContent>
    </Card>
  );
}
