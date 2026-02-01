import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProfileForm } from "@/components/profile/profile-form";
import { getCurrentUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createSession } from "@/lib/auth/session";
import {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
} from "@/lib/auth/cookies";
import { Spinner } from "@/components/ui/spinner";

export default async function CreateProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const returnUrl =
    typeof resolvedSearchParams.returnUrl === "string"
      ? resolvedSearchParams.returnUrl
      : undefined;

  const user = await getCurrentUser();

  if (!user) {
    const loginUrl = returnUrl
      ? `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`
      : "/auth/login";
    redirect(loginUrl);
  }

  // Check if user already has a profile
  const existingProfile = await db.userProfile.findUnique({
    where: { userId: user.userId },
  });

  // If user has a profile but token says hasProfile: false, update the session
  if (existingProfile && !user.hasProfile) {
    // Get full user details
    const fullUser = await db.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (fullUser) {
      // Create new session with hasProfile: true
      const { accessToken, refreshToken } = await createSession({
        id: fullUser.id,
        email: fullUser.email,
        role: fullUser.role,
        hasProfile: true,
      });

      // Update cookies
      const cookieStore = await cookies();
      cookieStore.set("accessToken", accessToken, {
        ...getAccessTokenCookieOptions(),
      });

      cookieStore.set("refreshToken", refreshToken, {
        ...getRefreshTokenCookieOptions(),
      });

      // Redirect to dashboard based on role or returnUrl
      if (returnUrl) {
        redirect(returnUrl);
      }

      switch (fullUser.role) {
        case "Student":
          redirect("/dashboard/student");
        case "Moderator":
          redirect("/dashboard/moderator");
        case "Administrator":
          redirect("/dashboard/admin");
        default:
          redirect("/");
      }
    }
  }

  // If user already has a profile and token is correct, redirect to dashboard or returnUrl
  if (existingProfile && user.hasProfile) {
    if (returnUrl) {
      redirect(returnUrl);
    }

    switch (user.role) {
      case "Student":
        redirect("/dashboard/student");
      case "Moderator":
        redirect("/dashboard/moderator");
      case "Administrator":
        redirect("/dashboard/admin");
      default:
        redirect("/");
    }
  }
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Complete Your Profile
        </h1>
        <p className="text-muted-foreground mt-2">
          Please provide your information to continue. This information will be
          used for event attendance tracking and verification.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        }
      >
        <ProfileForm />
      </Suspense>

      {/* Help Card */}
      <Card className="mt-6 bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">Need Help?</CardTitle>
          <CardDescription>
            Quick reference for completing your profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <strong className="text-foreground">Student ID:</strong> Use your
            official university student ID number (e.g., 2024-12345).
          </div>
          <div>
            <strong className="text-foreground">Department/Colleges:</strong>{" "}
            Select your college department from the dropdown menu.
          </div>
          <div>
            <strong className="text-foreground">Course:</strong> Enter your
            program or course name (e.g., Computer Science, Business
            Administration).
          </div>
          <div>
            <strong className="text-foreground">Year Level:</strong> Enter a
            number from 1 to 6 representing your current year in the program.
          </div>
          <div>
            <strong className="text-foreground">Section:</strong> Field for your
            section assignment (e.g., A, B, 1, 2).
          </div>
          <div>
            <strong className="text-foreground">Contact Number:</strong> Field
            for receiving event notifications via SMS.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
