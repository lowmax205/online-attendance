"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card } from "@/components/ui/card";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

interface AttendanceMapMarker {
  id: string;
  checkInLatitude: number | null;
  checkInLongitude: number | null;
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
  verificationStatus: string;
  userName: string;
}

interface EventDetailMapProps {
  venueLatitude: number;
  venueLongitude: number;
  venueName: string;
  attendances: AttendanceMapMarker[];
}

const STATUS_COLORS = {
  Approved: "#10b981", // green
  Pending: "#f59e0b", // amber
  Rejected: "#ef4444", // red
};

export function EventDetailMap({
  venueLatitude,
  venueLongitude,
  venueName,
  attendances,
}: EventDetailMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return; // Initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [venueLongitude, venueLatitude],
      zoom: 15,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [venueLatitude, venueLongitude]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    const markers = document.querySelectorAll(".mapboxgl-marker");
    markers.forEach((marker) => marker.remove());

    // Add venue marker
    const venueEl = document.createElement("div");
    venueEl.className = "venue-marker";
    venueEl.style.width = "32px";
    venueEl.style.height = "32px";
    venueEl.style.borderRadius = "50%";
    venueEl.style.backgroundColor = "#ef4444";
    venueEl.style.border = "3px solid white";
    venueEl.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";

    new mapboxgl.Marker(venueEl)
      .setLngLat([venueLongitude, venueLatitude])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<div style="color: #0f172a;"><strong>${venueName}</strong><br/>Event Venue</div>`,
        ),
      )
      .addTo(map.current);

    // Helper to build an approximate circle polygon around the venue in meters
    const makeCircle = (
      centerLon: number,
      centerLat: number,
      radiusMeters: number,
      steps = 64,
    ): GeoJSON.Feature<GeoJSON.Polygon> => {
      const coords: [number, number][] = [];
      // Earth radius
      const R = 6378137;
      for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * 2 * Math.PI;
        const dx = (radiusMeters * Math.cos(theta)) / R;
        const dy = (radiusMeters * Math.sin(theta)) / R;
        const lon = centerLon + (dx * 180) / Math.PI;
        const lat =
          centerLat +
          (dy * 180) / Math.PI / Math.cos((centerLat * Math.PI) / 180);
        coords.push([lon, lat]);
      }
      return {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [coords] },
        properties: {},
      };
    };

    // Add radius rings: 20m (green), 80m (amber), 100m (red)
    const circle20 = makeCircle(venueLongitude, venueLatitude, 20);
    const circle80 = makeCircle(venueLongitude, venueLatitude, 80);
    const circle100 = makeCircle(venueLongitude, venueLatitude, 100);

    // Add sources
    if (!map.current.getSource("venue-circle-20")) {
      map.current.addSource("venue-circle-20", {
        type: "geojson",
        data: circle20,
      });
    }
    if (!map.current.getSource("venue-circle-80")) {
      map.current.addSource("venue-circle-80", {
        type: "geojson",
        data: circle80,
      });
    }
    if (!map.current.getSource("venue-circle-100")) {
      map.current.addSource("venue-circle-100", {
        type: "geojson",
        data: circle100,
      });
    }

    // Add fill layers beneath markers
    if (!map.current.getLayer("venue-circle-100-fill")) {
      map.current.addLayer({
        id: "venue-circle-100-fill",
        type: "fill",
        source: "venue-circle-100",
        paint: {
          "fill-color": "#fca5a5", // red-300
          "fill-opacity": 0.15,
        },
      });
    }
    if (!map.current.getLayer("venue-circle-80-fill")) {
      map.current.addLayer({
        id: "venue-circle-80-fill",
        type: "fill",
        source: "venue-circle-80",
        paint: {
          "fill-color": "#fde68a", // amber-200
          "fill-opacity": 0.18,
        },
      });
    }
    if (!map.current.getLayer("venue-circle-20-fill")) {
      map.current.addLayer({
        id: "venue-circle-20-fill",
        type: "fill",
        source: "venue-circle-20",
        paint: {
          "fill-color": "#86efac", // green-300
          "fill-opacity": 0.22,
        },
      });
    }

    // Add outlines for clarity
    const addOutline = (id: string, source: string, color: string) => {
      if (!map.current!.getLayer(id)) {
        map.current!.addLayer({
          id,
          type: "line",
          source,
          paint: {
            "line-color": color,
            "line-width": 2,
            "line-opacity": 0.6,
          },
        });
      }
    };
    addOutline("venue-circle-100-outline", "venue-circle-100", "#ef4444");
    addOutline("venue-circle-80-outline", "venue-circle-80", "#f59e0b");
    addOutline("venue-circle-20-outline", "venue-circle-20", "#10b981");

    // Add attendance markers
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([venueLongitude, venueLatitude]);

    attendances.forEach((attendance) => {
      if (!map.current) return;

      const color =
        STATUS_COLORS[
          attendance.verificationStatus as keyof typeof STATUS_COLORS
        ] || "#6b7280";

      // Check-in marker
      if (
        attendance.checkInLatitude !== null &&
        attendance.checkInLongitude !== null
      ) {
        const checkInEl = document.createElement("div");
        checkInEl.style.width = "20px";
        checkInEl.style.height = "20px";
        checkInEl.style.borderRadius = "50%";
        checkInEl.style.backgroundColor = color;
        checkInEl.style.border = "2px solid white";
        checkInEl.style.boxShadow = "0 1px 3px rgba(0,0,0,0.3)";
        checkInEl.style.cursor = "pointer";

        new mapboxgl.Marker(checkInEl)
          .setLngLat([attendance.checkInLongitude, attendance.checkInLatitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 15 }).setHTML(
              `<div style="color: #0f172a;"><strong>${attendance.userName}</strong><br/>Check-in<br/>Status: ${attendance.verificationStatus}</div>`,
            ),
          )
          .addTo(map.current);

        bounds.extend([
          attendance.checkInLongitude,
          attendance.checkInLatitude,
        ]);
      }

      // Check-out marker
      if (
        attendance.checkOutLatitude !== null &&
        attendance.checkOutLongitude !== null
      ) {
        const checkOutEl = document.createElement("div");
        checkOutEl.style.width = "16px";
        checkOutEl.style.height = "16px";
        checkOutEl.style.borderRadius = "50%";
        checkOutEl.style.backgroundColor = color;
        checkOutEl.style.border = "2px solid white";
        checkOutEl.style.boxShadow = "0 1px 3px rgba(0,0,0,0.3)";
        checkOutEl.style.opacity = "0.7";
        checkOutEl.style.cursor = "pointer";

        new mapboxgl.Marker(checkOutEl)
          .setLngLat([
            attendance.checkOutLongitude,
            attendance.checkOutLatitude,
          ])
          .setPopup(
            new mapboxgl.Popup({ offset: 15 }).setHTML(
              `<div style="color: #0f172a;"><strong>${attendance.userName}</strong><br/>Check-out<br/>Status: ${attendance.verificationStatus}</div>`,
            ),
          )
          .addTo(map.current);

        bounds.extend([
          attendance.checkOutLongitude,
          attendance.checkOutLatitude,
        ]);
      }
    });

    // Fit map to show all markers
    if (attendances.length > 0) {
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 19,
      });
    }
  }, [mapLoaded, attendances, venueLatitude, venueLongitude, venueName]);

  return (
    <Card className="overflow-hidden">
      <div ref={mapContainer} className="h-[400px] w-full" />
      <div className="p-4 bg-muted/50 text-xs space-y-1">
        <div className="flex flex-wrap items-center gap-4">
          {/* Venue */}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white" />
            <span>Venue</span>
          </div>
          {/* Radius Rings */}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-300 border border-white" />
            <span>20m radius</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-amber-200 border border-white" />
            <span>80m radius</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-300 border border-white" />
            <span>100m radius</span>
          </div>
          {/* Statuses */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 border border-white" />
            <span>Approved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500 border border-white" />
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 border border-white" />
            <span>Rejected</span>
          </div>
        </div>
        <p className="text-muted-foreground">
          Larger markers = check-in, smaller markers = check-out
        </p>
      </div>
    </Card>
  );
}
