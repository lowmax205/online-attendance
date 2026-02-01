import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { ProfileEditForm } from "@/components/profile/profile-edit-form";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch user profile with all details
  const userWithProfile = await db.user.findUnique({
    where: { id: user.userId },
    include: {
      UserProfile: true,
    },
  });

  if (!userWithProfile) {
    redirect("/auth/login");
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your profile information, upload documents, and update your
          details.
        </p>
      </div>

      <ProfileEditForm
        user={userWithProfile}
        profile={userWithProfile.UserProfile}
      />
    </div>
  );
}
