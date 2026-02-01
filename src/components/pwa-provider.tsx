"use client";

import { ReactNode, useEffect } from "react";
import { useServiceWorker } from "@/hooks/use-service-worker";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { PWAUpdatePrompt } from "@/components/pwa-update-prompt";
import { PWAInstallProvider } from "@/hooks/use-pwa-install";

interface PWAProviderProps {
  children: ReactNode;
}

/**
 * PWA Provider Component
 *
 * Wraps the app to provide PWA functionality:
 * - Service worker registration
 * - Install prompt on mobile
 * - Update notification when new version available
 * - Offline indicator
 */
export function PWAProvider({ children }: PWAProviderProps) {
  const { isSupported, isOnline, updateAvailable, applyUpdate } =
    useServiceWorker();

  // Log PWA status in development
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[PWA] Status:", {
        isSupported,
        isOnline,
        updateAvailable,
      });
    }
  }, [isSupported, isOnline, updateAvailable]);

  return (
    <PWAInstallProvider>
      <>
        {children}

        {/* Install prompt for mobile users */}
        <PWAInstallPrompt />

        {/* Update notification when new version is available */}
        {updateAvailable && <PWAUpdatePrompt onUpdate={applyUpdate} />}

        {/* Offline indicator - could be expanded */}
        {!isOnline && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground text-center text-sm py-2">
            You are currently offline. Some features may not be available.
          </div>
        )}
      </>
    </PWAInstallProvider>
  );
}
