"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";
import { useGeolocation } from "@/hooks/use-geolocation";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

interface MapLocationPickerProps {
  onLocationSelect: (latitude: number, longitude: number) => void;
  initialLatitude?: number;
  initialLongitude?: number;
}

export function MapLocationPicker({
  onLocationSelect,
  // Surigao Coordinates as default
  initialLatitude = 9.787448,
  initialLongitude = 125.494373,
}: MapLocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  const [locationMode, setLocationMode] = useState<"current" | "picker">(
    "picker",
  );
  const [selectedCoords, setSelectedCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const {
    coords,
    error,
    loading,
    permissionState,
    requestPermission,
    clearError,
  } = useGeolocation();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [initialLongitude, initialLatitude],
      zoom: 15,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Initialize marker
    marker.current = new mapboxgl.Marker({
      draggable: locationMode === "picker",
      color: "#2563eb",
    })
      .setLngLat([initialLongitude, initialLatitude])
      .addTo(map.current);

    // Handle marker drag end
    marker.current.on("dragend", () => {
      if (marker.current) {
        const lngLat = marker.current.getLngLat();
        // Round to 6 decimal places
        const lat = Math.round(lngLat.lat * 1000000) / 1000000;
        const lng = Math.round(lngLat.lng * 1000000) / 1000000;
        setSelectedCoords({ lat, lng });
      }
    });

    // Handle map click for picker mode
    map.current.on("click", (e) => {
      if (locationMode === "picker" && marker.current && map.current) {
        // Round to 6 decimal places
        const lat = Math.round(e.lngLat.lat * 1000000) / 1000000;
        const lng = Math.round(e.lngLat.lng * 1000000) / 1000000;
        marker.current.setLngLat([lng, lat]);
        setSelectedCoords({ lat, lng });
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [initialLatitude, initialLongitude, locationMode]);

  // Update marker draggability when mode changes
  useEffect(() => {
    if (marker.current) {
      marker.current.setDraggable(locationMode === "picker");
    }
  }, [locationMode]);

  const handleLocateMe = () => {
    if (permissionState === "denied") {
      // Clear any previous error message to retry
      clearError();
    }
    requestPermission();
  };

  // Keep button loading state in sync with hook
  useEffect(() => {
    setIsLocating(loading);
  }, [loading]);

  // When coords arrive from hook, update map/marker and propagate selection
  useEffect(() => {
    if (coords && map.current && marker.current && locationMode === "current") {
      // Round to 6 decimal places
      const latitude = Math.round(coords.latitude * 1000000) / 1000000;
      const longitude = Math.round(coords.longitude * 1000000) / 1000000;
      map.current.flyTo({
        center: [longitude, latitude],
        zoom: 17,
        essential: true,
      });
      marker.current.setLngLat([longitude, latitude]);
      setSelectedCoords({ lat: latitude, lng: longitude });
      onLocationSelect(latitude, longitude);
      toast.success("Current location detected");
    }
  }, [coords, locationMode, onLocationSelect]);

  // Show hook errors as toasts
  useEffect(() => {
    if (error && locationMode === "current") {
      toast.error("Location error", { description: error, duration: 6000 });
    }
  }, [error, locationMode]);

  const handleVerifyLocation = () => {
    if (selectedCoords) {
      onLocationSelect(selectedCoords.lat, selectedCoords.lng);
      toast.success("Location verified and coordinates updated");
    } else {
      toast.error("Please select a location on the map");
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex gap-3">
        <Select
          value={locationMode}
          onValueChange={(value: "current" | "picker") =>
            setLocationMode(value)
          }
        >
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4" />
                Current Location
              </div>
            </SelectItem>
            <SelectItem value="picker">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Map Picker
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {locationMode === "current" ? (
          <Button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            className="min-w-[100px]"
          >
            {isLocating ? "Locating..." : "Locate"}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleVerifyLocation}
            disabled={!selectedCoords}
            className="min-w-[100px]"
          >
            Verify
          </Button>
        )}
      </div>

      {/* Map Container */}
      <div
        ref={mapContainer}
        className="w-full h-[400px] rounded-lg border overflow-hidden"
      />

      {/* Instructions */}
      <p className="text-sm text-muted-foreground">
        {locationMode === "current" ? (
          <>Click &quot;Locate&quot; to use your current location</>
        ) : (
          <>
            Click on the map or drag the marker to select a location, then click
            &quot;Verify&quot;
          </>
        )}
      </p>
    </div>
  );
}
