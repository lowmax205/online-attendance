"use client";

import * as React from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerificationStatus } from "@prisma/client";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

/**
 * Attendance Geolocation Map Component
 * Visualizes attendance GPS coordinates on a map with color-coded distance indicators
 */

interface GeolocationData {
  id: string;
  userId: string;
  userName: string;
  eventId: string;
  eventName: string;
  eventLat: number;
  eventLon: number;
  checkInLat: number | null;
  checkInLon: number | null;
  checkOutLat: number | null;
  checkOutLon: number | null;
  checkInDistance: number | null;
  checkOutDistance: number | null;
  verificationStatus: VerificationStatus;
  checkInSubmittedAt: Date | null;
  checkOutSubmittedAt: Date | null;
}

interface AttendanceGeolocationMapProps {
  data: GeolocationData[];
  isLoading?: boolean;
  onAttendanceClick?: (attendanceId: string) => void;
}

// Color scale based on distance from event venue
// 0-20m: green, 20-80m: amber, 80-100m: red, >100m: dark red
const getDistanceColor = (distance: number | null): string => {
  if (distance === null) return "#94a3b8"; // gray for unknown
  if (distance <= 20) return "#10b981"; // green (Approved range)
  if (distance <= 80) return "#f59e0b"; // amber (Pending range)
  if (distance <= 100) return "#ef4444"; // red (Rejected threshold)
  return "#b91c1c"; // dark red (>100m)
};

const getDistanceLabel = (distance: number | null): string => {
  if (distance === null) return "Unknown";
  if (distance <= 20) return "0-20m (Very Accurate)";
  if (distance <= 80) return "20-80m (Moderate)";
  if (distance <= 100) return "80-100m (Far)";
  return ">100m (Very Far)";
};

export function AttendanceGeolocationMap({
  data,
  isLoading,
  onAttendanceClick,
}: AttendanceGeolocationMapProps) {
  const mapContainer = React.useRef<HTMLDivElement>(null);
  const map = React.useRef<mapboxgl.Map | null>(null);
  const markers = React.useRef<mapboxgl.Marker[]>([]);
  const [mapReady, setMapReady] = React.useState(false);

  // Initialize map
  React.useEffect(() => {
    if (!mapContainer.current || map.current || isLoading) return;

    // Check if Mapbox token is set
    if (!mapboxgl.accessToken) {
      console.error("Mapbox access token is not set");
      return;
    }

    // Default center (Philippines)
    const defaultCenter: [number, number] = [121.774, 12.8797];

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: defaultCenter,
        zoom: 5,
      });

      map.current.on("load", () => {
        setMapReady(true);
      });

      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    } catch (error) {
      console.error("Error initializing Mapbox map:", error);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      setMapReady(false);
    };
  }, [isLoading]);

  // Update markers when data changes
  React.useEffect(() => {
    if (!map.current || !mapReady || isLoading) return;

    // Clear existing markers
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    if (data.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    const eventLocations = new Set<string>();

    // Add markers for each attendance
    data.forEach((attendance) => {
      // Determine which coordinates to use (prefer check-in)
      const lat =
        attendance.checkInLat !== null
          ? attendance.checkInLat
          : attendance.checkOutLat;
      const lon =
        attendance.checkInLon !== null
          ? attendance.checkInLon
          : attendance.checkOutLon;
      const distance =
        attendance.checkInDistance !== null
          ? attendance.checkInDistance
          : attendance.checkOutDistance;

      if (lat === null || lon === null) return;

      // Create marker element
      const el = document.createElement("div");
      el.className = "attendance-marker";
      el.style.width = "12px";
      el.style.height = "12px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = getDistanceColor(distance);
      el.style.border = "2px solid white";
      el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
      el.style.cursor = "pointer";
      el.style.transition = "all 0.2s";
      el.style.zIndex = "1";

      // Hover effect
      el.addEventListener("mouseenter", () => {
        el.style.width = "16px";
        el.style.height = "16px";
        el.style.zIndex = "1000";
      });
      el.addEventListener("mouseleave", () => {
        el.style.width = "12px";
        el.style.height = "12px";
        el.style.zIndex = "1";
      });

      // Click handler
      if (onAttendanceClick) {
        el.addEventListener("click", () => {
          onAttendanceClick(attendance.id);
        });
      }

      // Create popup
      const popup = new mapboxgl.Popup({ offset: 15 }).setHTML(`
        <div style="padding: 8px; min-width: 200px; color: #0f172a;">
          <div style="font-weight: 600; margin-bottom: 4px; color: #0f172a;">${attendance.userName}</div>
          <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">
            ${attendance.eventName}
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">
            Distance: <span style="font-weight: 500; color: #0f172a;">${distance !== null ? `${Math.round(distance)}m` : "Unknown"}</span>
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">
            Accuracy: <span style="font-weight: 500; color: ${getDistanceColor(distance)};">${getDistanceLabel(distance)}</span>
          </div>
          <div style="font-size: 11px; color: #475569;">
            Status: <span style="font-weight: 500; color: #0f172a;">${attendance.verificationStatus}</span>
          </div>
          ${onAttendanceClick ? '<div style="margin-top: 8px; font-size: 11px; color: #2563eb; cursor: pointer; font-weight: 500;">Click to view details</div>' : ""}
        </div>
      `);

      // Create marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([lon, lat])
        .setPopup(popup)
        .addTo(map.current!);

      markers.current.push(marker);
      bounds.extend([lon, lat]);

      // Add event venue marker (only once per event)
      const eventKey = `${attendance.eventId}`;
      if (
        !eventLocations.has(eventKey) &&
        attendance.eventLat &&
        attendance.eventLon
      ) {
        eventLocations.add(eventKey);

        // Event venue marker (larger, red)
        const venueEl = document.createElement("div");
        venueEl.className = "venue-marker";
        venueEl.style.width = "20px";
        venueEl.style.height = "20px";
        venueEl.style.borderRadius = "50%";
        venueEl.style.backgroundColor = "#dc2626";
        venueEl.style.border = "3px solid white";
        venueEl.style.boxShadow = "0 2px 6px rgba(0,0,0,0.4)";
        venueEl.style.zIndex = "2";

        const venuePopup = new mapboxgl.Popup({ offset: 15 }).setHTML(`
          <div style="padding: 8px; color: #0f172a;">
            <div style="font-weight: 600; margin-bottom: 4px; color: #0f172a;">📍 Event Venue</div>
            <div style="font-size: 12px; color: #64748b;">
              ${attendance.eventName}
            </div>
          </div>
        `);

        const venueMarker = new mapboxgl.Marker(venueEl)
          .setLngLat([attendance.eventLon, attendance.eventLat])
          .setPopup(venuePopup)
          .addTo(map.current!);

        markers.current.push(venueMarker);
        bounds.extend([attendance.eventLon, attendance.eventLat]);
      }
    });

    // Fit map to show all markers
    if (!bounds.isEmpty()) {
      map.current.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 25,
      });
    }
  }, [data, isLoading, onAttendanceClick, mapReady]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attendance Geolocation Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Attendance Geolocation Map</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="text-sm">
                  Visualizes GPS coordinates of attendance check-ins. Color
                  indicates accuracy of location relative to event venue.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground text-sm mb-2">
                No geolocation data available
              </p>
              <p className="text-muted-foreground text-xs">
                GPS coordinates will be plotted here once attendance with
                location data is recorded
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Attendance Geolocation Map</CardTitle>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-sm">
                Visualizes GPS coordinates of attendance check-ins. Color
                indicates accuracy of location relative to event venue.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Map Container */}
        <div
          ref={mapContainer}
          className="h-[300px] w-full rounded-lg overflow-hidden"
        />

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full border-2 border-white shadow"
              style={{ backgroundColor: "#dc2626" }}
            />
            <span className="text-muted-foreground">Event Venue</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full border-2 border-white shadow"
              style={{ backgroundColor: "#10b981" }}
            />
            <span className="text-muted-foreground">0-20m</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full border-2 border-white shadow"
              style={{ backgroundColor: "#f59e0b" }}
            />
            <span className="text-muted-foreground">20-80m</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full border-2 border-white shadow"
              style={{ backgroundColor: "#ef4444" }}
            />
            <span className="text-muted-foreground">80-100m</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full border-2 border-white shadow"
              style={{ backgroundColor: "#b91c1c" }}
            />
            <span className="text-muted-foreground">&gt;100m</span>
          </div>
        </div>

        {/* Summary */}
        {data.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Showing {data.length} attendance record
            {data.length !== 1 ? "s" : ""} with GPS coordinates
          </div>
        )}

        {data.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">
            No attendance records with GPS coordinates in the selected period
          </div>
        )}
      </CardContent>
    </Card>
  );
}
