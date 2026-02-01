"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePWAInstall } from "@/hooks/use-pwa-install";

/**
 * PWA Install Prompt Component
 *
 * Shows a banner at the bottom of the screen on mobile devices
 * when the app can be installed as a PWA.
 *
 * Features:
 * - Detects PWA install capability (mobile only)
 * - Dismissible with local storage persistence (1 day)
 * - Animated slide-up appearance
 * - iOS manual instructions support
 */

export function PWAInstallPrompt() {
  const { isMobile, isIOS, deferredPrompt, install } = usePWAInstall();
  const [showPrompt, setShowPrompt] = React.useState(false);
  const [isInstalling, setIsInstalling] = React.useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = React.useState(false);

  React.useEffect(() => {
    // Only show on mobile devices
    if (!isMobile) {
      return;
    }

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return;
    }

    // Check if dismissed recently (1 day)
    const dismissedAt = localStorage.getItem("pwa-prompt-dismissed");
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const hoursSinceDismissed =
        (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60);
      if (hoursSinceDismissed < 24) {
        return;
      }
    }

    // For iOS or when we have a deferred prompt, show after a delay
    if (isIOS) {
      // iOS - show manual instructions after delay
      setTimeout(() => setShowPrompt(true), 5000);
    } else if (deferredPrompt) {
      // Android/Chrome - show prompt after delay
      setTimeout(() => setShowPrompt(true), 3000);
    }
  }, [isMobile, isIOS, deferredPrompt]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);

    try {
      await install();
      setShowPrompt(false);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-prompt-dismissed", new Date().toISOString());
  };

  const handleIOSInstructions = () => {
    setShowIOSInstructions(!showIOSInstructions);
  };

  // Only show prompt on mobile devices that haven't already dismissed it
  if (!showPrompt || !isMobile) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 safe-area-bottom",
        "animate-in slide-in-from-bottom-full duration-500",
      )}
    >
      <div className="mx-auto max-w-lg p-4">
        <div className="rounded-xl border bg-background/95 backdrop-blur-sm shadow-lg">
          <div className="flex items-start gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground">
                Install Attendance App
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add to your home screen for quick access.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 -mt-1 -mr-1"
              onClick={handleDismiss}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {isIOS ? (
            <div className="px-4 pb-4">
              {showIOSInstructions ? (
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <ol className="space-y-2 list-decimal list-inside text-muted-foreground">
                    <li>
                      Tap the <strong>Share</strong> button{" "}
                      <span className="inline-block w-5 h-5 align-text-bottom">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2l4 4h-3v8h-2V6H8l4-4zm-7 9v10h14V11h2v12H3V11h2z" />
                        </svg>
                      </span>
                    </li>
                    <li>
                      Scroll and tap <strong>Add to Home Screen</strong>
                    </li>
                    <li>
                      Tap <strong>Add</strong> to confirm
                    </li>
                  </ol>
                </div>
              ) : (
                <Button
                  variant="default"
                  className="w-full"
                  onClick={handleIOSInstructions}
                >
                  <Download className="mr-2 h-4 w-4" />
                  How to Install
                </Button>
              )}
            </div>
          ) : (
            <div className="flex gap-2 px-4 pb-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDismiss}
              >
                Not now
              </Button>
              <Button
                variant="default"
                className="flex-1"
                onClick={handleInstall}
                disabled={isInstalling || !deferredPrompt}
              >
                {isInstalling ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Installing...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Install
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
