"use client";

import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-geolocation";
import { Monitor, Smartphone, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DeviceAccessControlProps {
  children: React.ReactNode;
  userRole: "student" | "moderator" | "admin";
  requireMobile?: boolean;
}

/**
 * Component to control access based on device type and user role
 * - Students: Mobile only
 * - Moderators/Admins: Can override with ALT+O
 */
export function DeviceAccessControl({
  children,
  userRole,
  requireMobile = true,
}: DeviceAccessControlProps) {
  const isMobile = useIsMobile();
  const [hasMounted, setHasMounted] = useState(false);
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const { toast } = useToast();

  // Check if override is allowed
  const canOverride = userRole === "moderator" || userRole === "admin";

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Handle ALT+O keyboard shortcut
  useEffect(() => {
    if (!canOverride || !requireMobile) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // ALT+O to toggle override
      if (event.altKey && event.key.toLowerCase() === "o") {
        event.preventDefault();
        setOverrideEnabled((prev) => {
          const newState = !prev;
          toast({
            title: newState
              ? "Desktop Override Enabled"
              : "Desktop Override Disabled",
            description: newState
              ? "You can now access the attendance form on desktop."
              : "Mobile device restriction re-enabled.",
            variant: newState ? "default" : "destructive",
          });
          return newState;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canOverride, requireMobile, toast]);

  // Allow access if:
  // 1. Mobile device detected
  // 2. Mobile requirement is disabled
  // 3. Override is enabled (moderator/admin only)
  const hasAccess =
    isMobile || !requireMobile || (canOverride && overrideEnabled);

  if (!hasMounted && requireMobile) {
    return (
      <div
        className="flex items-center justify-center py-16"
        aria-live="polite"
      >
        <div className="text-sm text-muted-foreground">
          Checking device access...
        </div>
      </div>
    );
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  // Show access denied message
  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <div className="rounded-lg border border-warning bg-warning/10 p-8 text-center">
        <div className="flex justify-center mb-4">
          {canOverride ? (
            <ShieldCheck className="h-16 w-16 text-warning" />
          ) : (
            <Smartphone className="h-16 w-16 text-warning" />
          )}
        </div>

        <h2 className="text-xl font-semibold mb-3">
          {canOverride ? "Desktop Access Restricted" : "Mobile Device Required"}
        </h2>

        <p className="text-sm text-muted-foreground mb-6">
          {canOverride ? (
            <>
              The attendance form is optimized for mobile devices to ensure
              accurate GPS location tracking.
              <br />
              <br />
              As a <span className="font-semibold capitalize">{userRole}</span>,
              you can override this restriction.
            </>
          ) : (
            <>
              This attendance form requires a mobile device for accurate
              GPS-based location verification. Please access this page from your
              smartphone or tablet.
            </>
          )}
        </p>

        {canOverride && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Monitor className="h-5 w-5" />
                <span className="font-semibold">
                  Override Keyboard Shortcut
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Press{" "}
                <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-background border border-border rounded">
                  ALT
                </kbd>
                {" + "}
                <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-background border border-border rounded">
                  O
                </kbd>{" "}
                to enable desktop access
              </p>
              <p className="text-xs text-muted-foreground italic">
                Note: Desktop geolocation may be less accurate than mobile GPS.
              </p>
            </div>

            <a
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Back to Dashboard
            </a>
          </div>
        )}

        {!canOverride && (
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Back to Dashboard
          </a>
        )}
      </div>
    </div>
  );
}
