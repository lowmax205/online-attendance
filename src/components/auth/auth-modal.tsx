"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";

interface AuthModalProps {
  trigger?: React.ReactNode;
  defaultTab?: "login" | "register";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AuthModal({
  trigger,
  defaultTab = "login",
  open: controlledOpen,
  onOpenChange,
}: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">(defaultTab);
  const [internalOpen, setInternalOpen] = useState(false);
  const wasOpenRef = useRef<boolean>(controlledOpen ?? internalOpen);

  const open =
    typeof controlledOpen === "boolean" ? controlledOpen : internalOpen;

  const handleOpenChange = (nextOpen: boolean) => {
    if (typeof controlledOpen !== "boolean") {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  useEffect(() => {
    if (!wasOpenRef.current && open) {
      setActiveTab(defaultTab);
    } else if (!open) {
      setActiveTab(defaultTab);
    }
    wasOpenRef.current = open;
  }, [open, defaultTab]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {activeTab === "login" ? "Welcome Back" : "Create Account"}
          </DialogTitle>
          <DialogDescription>
            {activeTab === "login"
              ? "Log in to your account to continue"
              : "Register to start tracking event attendance"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tab Switcher */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("login")}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors min-h-11 ${
                activeTab === "login"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("register")}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors min-h-11 ${
                activeTab === "register"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              Register
            </button>
          </div>

          <Separator />

          {/* Form Content */}
          <div className="py-2">
            {activeTab === "login" ? <LoginForm /> : <RegisterForm />}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          {activeTab === "login" ? (
            <p>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => setActiveTab("register")}
                className="text-primary hover:underline font-medium"
              >
                Register here
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setActiveTab("login")}
                className="text-primary hover:underline font-medium"
              >
                Log in here
              </button>
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * AuthModalTrigger Component
 * Pre-configured trigger button for common use cases
 */
export function AuthModalTrigger({
  defaultTab,
}: {
  defaultTab?: "login" | "register";
}) {
  return (
    <AuthModal
      defaultTab={defaultTab}
      trigger={
        <button
          type="button"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium min-h-11 min-w-24"
        >
          Login
        </button>
      }
    />
  );
}
