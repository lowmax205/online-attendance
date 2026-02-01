"use client";

import { useEffect } from "react";
import { AuthModal } from "@/components/auth/auth-modal";

interface LoginPromptProps {
  returnUrl: string;
}

export function LoginPrompt({ returnUrl }: LoginPromptProps) {
  // Ensure the current URL carries the returnUrl so LoginForm redirects back
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("returnUrl") !== returnUrl) {
        url.searchParams.set("returnUrl", returnUrl);
        window.history.replaceState({}, "", url.toString());
      }
    } catch {
      // ignore
    }
  }, [returnUrl]);

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <div className="rounded-lg border bg-card p-6 space-y-4 text-center">
        <h2 className="text-xl font-semibold">Sign in to Continue</h2>
        <p className="text-sm text-muted-foreground">
          Please log in to check in or out for this event.
        </p>
      </div>
      {/* Render the auth modal opened by default */}
      <AuthModal defaultTab="login" open={true} />
    </div>
  );
}
