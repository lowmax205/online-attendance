"use client";

import { useEffect, useState, useCallback } from "react";

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  updateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

/**
 * Hook for managing the PWA service worker
 *
 * Features:
 * - Registers service worker on mount
 * - Tracks online/offline state
 * - Detects updates and provides update mechanism
 * - Provides unregister capability for debugging
 */
export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isOnline: true,
    updateAvailable: false,
    registration: null,
  });

  // Register service worker
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isSupported = "serviceWorker" in navigator;
    setState((prev) => ({ ...prev, isSupported }));

    if (!isSupported) {
      console.log("[PWA] Service workers not supported");
      return;
    }

    // Set initial online state
    setState((prev) => ({ ...prev, isOnline: navigator.onLine }));

    // Register service worker
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        console.log("[PWA] Service worker registered:", registration.scope);

        setState((prev) => ({
          ...prev,
          isRegistered: true,
          registration,
        }));

        // Check for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                // New service worker installed, update available
                console.log("[PWA] Update available");
                setState((prev) => ({ ...prev, updateAvailable: true }));
              }
            });
          }
        });

        // Check for updates periodically (every hour)
        setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000,
        );
      } catch (error) {
        console.error("[PWA] Service worker registration failed:", error);
      }
    };

    registerSW();

    // Handle online/offline events
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true }));
      console.log("[PWA] Back online");
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false }));
      console.log("[PWA] Gone offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Handle controller change (new service worker activated)
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      console.log("[PWA] New service worker activated, reloading...");
      window.location.reload();
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Apply update by activating new service worker
  const applyUpdate = useCallback(() => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  }, [state.registration]);

  // Unregister service worker (for debugging)
  const unregister = useCallback(async () => {
    if (state.registration) {
      const success = await state.registration.unregister();
      if (success) {
        console.log("[PWA] Service worker unregistered");
        setState((prev) => ({
          ...prev,
          isRegistered: false,
          registration: null,
        }));
      }
    }
  }, [state.registration]);

  return {
    ...state,
    applyUpdate,
    unregister,
  };
}
