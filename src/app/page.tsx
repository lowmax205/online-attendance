"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth/auth-modal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { StepCard } from "@/components/step-card";
import { Footer } from "@/components/footer";
import { useAuth } from "@/hooks/use-auth";

const steps = [
  {
    iconKey: "scan" as const,
    title: "Scan QR Code",
    description:
      "Students scan the unique QR code displayed at the event venue using their mobile device.",
  },
  {
    iconKey: "verify" as const,
    title: "Verify Location & Identity",
    description:
      "System verifies GPS location and captures selfie with event background for authentication.",
  },
  {
    iconKey: "record" as const,
    title: "Record Attendance",
    description:
      "Attendance is automatically recorded and real-time reports are updated instantly.",
  },
];

function ErrorAlert() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    // Clear error from URL after showing it
    if (error) {
      const timer = setTimeout(() => {
        window.history.replaceState({}, "", "/");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const getErrorMessage = () => {
    switch (error) {
      case "session_expired":
        return {
          title: "Session Expired",
          description:
            "Your session has expired. Please log in again to continue.",
        };
      case "authentication_required":
        return {
          title: "Authentication Required",
          description: "You need to be logged in to access that page.",
        };
      case "account_suspended":
        return {
          title: "Account Suspended",
          description:
            "Your account has been suspended. Please contact an administrator.",
        };
      case "insufficient_permissions":
        return {
          title: "Access Denied",
          description: "You don't have permission to access that page.",
        };
      default:
        return null;
    }
  };

  const errorInfo = getErrorMessage();

  if (!errorInfo) return null;

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <AlertTitle className="mb-1">{errorInfo.title}</AlertTitle>
      <AlertDescription>{errorInfo.description}</AlertDescription>
    </Alert>
  );
}

export default function HomePage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const handleGetStarted = () => {
    if (user) {
      // User is already logged in, redirect to their dashboard
      switch (user.role) {
        case "Student":
          router.push("/dashboard/student");
          break;
        case "Moderator":
          router.push("/dashboard/moderator");
          break;
        case "Administrator":
          router.push("/dashboard/admin");
          break;
        default:
          router.push("/dashboard");
      }
    } else {
      // User is not logged in, show the auth modal
      setIsAuthModalOpen(true);
    }
  };

  useEffect(() => {
    // Add snap-scroll class to body for homepage
    document.body.classList.add("snap-scroll");

    return () => {
      // Remove snap-scroll class when leaving homepage
      document.body.classList.remove("snap-scroll");
    };
  }, []);

  return (
    <>
      <AuthModal
        open={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        defaultTab="login"
      />
      {/* Hero Section - Full Viewport with Gradient Background */}
      <section className="snap-start snap-always relative min-h-screen flex flex-col overflow-hidden">
        {/* Gradient Background - Fixed to viewport */}
        <div className="fixed inset-0 w-full h-full -z-10 bg-linear-to-br from-primary/20 via-background to-secondary/20" />

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 max-w-7xl flex-1 flex flex-col justify-start items-center text-center py-8 pt-16 md:pt-32">
          {/* Error Alert */}
          <Suspense fallback={null}>
            <ErrorAlert />
          </Suspense>

          <div className="space-y-8 bg-muted/60 border rounded-xl p-28">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-lg">
              Event Attendance System
            </h1>
            <p className="text-lg md:text-xl text-foreground max-w-3xl mx-auto mb-8 drop-shadow-md">
              A modern, secure platform for tracking event attendance in
              educational institutions. Simplify check-ins, manage events, and
              gain insights, all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="min-h-11 min-w-44"
                onClick={handleGetStarted}
                disabled={isLoading}
              >
                {isLoading
                  ? "Loading..."
                  : user
                    ? "Go to Dashboard"
                    : "Get Started"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="min-h-11 min-w-44"
              >
                <Link href="/updates">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="snap-start snap-always min-h-screen flex flex-col justify-center bg-muted/60 py-20">
        <div className="container mx-auto px-4 max-w-7xl">
          <h2 className="text-3xl font-bold text-center mb-10">Key Features</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Quick Check-In</CardTitle>
                <CardDescription>
                  Students can check in to events with just a few clicks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Streamlined attendance process with QR code scanning and
                  manual entry options for maximum flexibility.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Role-Based Access</CardTitle>
                <CardDescription>
                  Different permissions for students, moderators, and
                  administrators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Secure access control ensures each user sees only the features
                  and data relevant to their role.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Real-Time Analytics</CardTitle>
                <CardDescription>
                  Track attendance trends and generate reports instantly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View live attendance data, export reports, and make
                  data-driven decisions for future events.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Event Management</CardTitle>
                <CardDescription>
                  Create and manage events with ease
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Moderators can create events, set capacity limits, and manage
                  attendee lists all from one dashboard.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security First</CardTitle>
                <CardDescription>
                  Built with enterprise-grade security standards
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  JWT authentication, rate limiting, session management, and
                  audit logging keep your data safe.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Accessible Design</CardTitle>
                <CardDescription>
                  WCAG 2.1 AA compliant interface for all users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Keyboard navigation, screen reader support, and high contrast
                  ratios ensure everyone can use the platform.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="snap-start snap-always min-h-screen flex flex-col bg-muted/60 pt-20">
        <div className="container mx-auto px-4 max-w-7xl mb-16">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              How It Works
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg leading-relaxed md:text-xl">
              Simple and secure attendance process in just three steps.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {steps.map((step, idx) => (
              <StepCard
                key={idx}
                iconKey={step.iconKey}
                title={step.title}
                description={step.description}
              />
            ))}
          </div>
        </div>
        <div className="mt-auto">
          <Footer />
        </div>
      </section>
    </>
  );
}
