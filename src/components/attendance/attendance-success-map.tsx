"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

interface AttendanceSuccessMapProps {
  venueLatitude: number;
  venueLongitude: number;
  venueName: string;
  checkInLatitude: number | null;
  checkInLongitude: number | null;
  checkOutLatitude?: number | null;
  checkOutLongitude?: number | null;
}

export function AttendanceSuccessMap({
  venueLatitude,
  venueLongitude,
  venueName,
  checkInLatitude,
  checkInLongitude,
  checkOutLatitude,
  checkOutLongitude,
}: AttendanceSuccessMapProps) {
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
      zoom: 20,
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

    // Add check-in marker
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([venueLongitude, venueLatitude]);

    if (checkInLatitude !== null && checkInLongitude !== null) {
      const checkInEl = document.createElement("div");
      checkInEl.style.width = "24px";
      checkInEl.style.height = "24px";
      checkInEl.style.borderRadius = "50%";
      checkInEl.style.backgroundColor = "#10b981";
      checkInEl.style.border = "3px solid white";
      checkInEl.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
      checkInEl.style.cursor = "pointer";

      new mapboxgl.Marker(checkInEl)
        .setLngLat([checkInLongitude, checkInLatitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 15 }).setHTML(
            `<div style="color: #0f172a;"><strong>Your Check-in Location</strong></div>`,
          ),
        )
        .addTo(map.current);

      bounds.extend([checkInLongitude, checkInLatitude]);
    }

    // Add check-out marker if available
    if (
      checkOutLatitude !== null &&
      checkOutLongitude !== null &&
      checkOutLatitude !== undefined &&
      checkOutLongitude !== undefined
    ) {
      const checkOutEl = document.createElement("div");
      checkOutEl.style.width = "20px";
      checkOutEl.style.height = "20px";
      checkOutEl.style.borderRadius = "50%";
      checkOutEl.style.backgroundColor = "#f59e0b";
      checkOutEl.style.border = "3px solid white";
      checkOutEl.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
      checkOutEl.style.cursor = "pointer";

      new mapboxgl.Marker(checkOutEl)
        .setLngLat([checkOutLongitude, checkOutLatitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 15 }).setHTML(
            `<div style="color: #0f172a;"><strong>Your Check-out Location</strong></div>`,
          ),
        )
        .addTo(map.current);

      bounds.extend([checkOutLongitude, checkOutLatitude]);
    }

    // Fit map to show all markers
    if (
      checkInLatitude !== null ||
      (checkOutLatitude !== null && checkOutLatitude !== undefined)
    ) {
      map.current.fitBounds(bounds, {
        padding: 30,
        maxZoom: 19,
      });
    }
  }, [
    mapLoaded,
    venueLatitude,
    venueLongitude,
    venueName,
    checkInLatitude,
    checkInLongitude,
    checkOutLatitude,
    checkOutLongitude,
  ]);

  return (
    <div className="space-y-3">
      <div ref={mapContainer} className="h-[300px] w-full rounded-lg" />
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white" />
          <span>Venue</span>
        </div>
        {checkInLatitude !== null && checkInLongitude !== null && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white" />
            <span>Check-in</span>
          </div>
        )}
        {checkOutLatitude !== null &&
          checkOutLongitude !== null &&
          checkOutLatitude !== undefined &&
          checkOutLongitude !== undefined && (
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white" />
              <span>Check-out</span>
            </div>
          )}
      </div>
    </div>
  );
}
