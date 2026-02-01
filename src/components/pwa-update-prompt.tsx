"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PWAUpdatePromptProps {
  onUpdate: () => void;
}

/**
 * PWA Update Prompt Component
 *
 * Shows when a new version of the app is available.
 * Allows user to update immediately or dismiss.
 */
export function PWAUpdatePrompt({ onUpdate }: PWAUpdatePromptProps) {
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed) return null;

  return (
    <div
      className={cn(
        "fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96",
        "animate-in slide-in-from-top-full duration-300",
      )}
    >
      <div className="rounded-lg border bg-background/95 backdrop-blur-sm shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <RefreshCw className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">Update Available</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              A new version of the app is ready. Refresh to update.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 -mt-1 -mr-1"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setDismissed(true)}
          >
            Later
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={onUpdate}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Update Now
          </Button>
        </div>
      </div>
    </div>
  );
}
