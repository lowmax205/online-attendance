"use client";

import { useState, useEffect } from "react";
import { useForm, type UseFormProps } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAcademicPrograms } from "@/hooks/use-academic-programs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form } from "@/components/ui/form";
import { FormFieldWrapper } from "@/components/form-field-wrapper";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { User, Upload, GraduationCap, Lock, AlertCircle } from "lucide-react";
import { User as UserType, UserProfile } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import {
  formatPhoneNumberForDisplay,
  formatPhoneNumberForStorage,
} from "@/lib/utils/phone-formatter";
import { changePassword } from "@/actions/profile/change-password";

const profileUpdateSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  contactNumber: z.string().optional(),
  department: z.enum(["CCIS", "COE", "CAS", "CAAS", "CTE", "COT"], {
    message: "Please select a valid department",
  }),
  course: z.string().min(1, "Course/Program is required").max(100),
  yearLevel: z.number().int().min(1).max(6),
  section: z.string().min(1, "Section is required").max(50),
  studentId: z
    .string()
    .min(1, "Student ID is required")
    .regex(
      /^\d{4}-\d{5}$/,
      "Student ID must follow the format YEAR-00000 (e.g., 2022-00529)",
    ),
  campus: z.enum(
    [
      "MainCampus",
      "MalimonoCampus",
      "MainitCampus",
      "ClaverCampus",
      "DelCarmenCampus",
    ],
    {
      message: "Please select a valid campus",
    },
  ),
});

type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

interface ProfileEditFormProps {
  user: UserType & { UserProfile: UserProfile | null };
  profile: UserProfile | null;
}

export function ProfileEditForm({ user, profile }: ProfileEditFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { selectedDepartment, courseOptions, handleDepartmentChange } =
    useAcademicPrograms(profile?.department);
  const [profilePicturePreview, setProfilePicturePreview] = useState<
    string | null
  >(profile?.profilePictureUrl || null);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(
    null,
  );
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { updateUser } = useAuth();
  const router = useRouter();

  const form = useForm<ProfileUpdateInput>({
    resolver: zodResolver(
      profileUpdateSchema,
    ) as UseFormProps<ProfileUpdateInput>["resolver"],
    mode: "onBlur",
    defaultValues: {
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      contactNumber: profile?.contactNumber || "",
      department: profile?.department || "CCIS",
      course: profile?.course || "",
      yearLevel: profile?.yearLevel || 1,
      section: profile?.section || "",
      studentId: profile?.studentId || "",
      campus: profile?.campus || "MainCampus",
    },
  } as UseFormProps<ProfileUpdateInput>);

  const formatStudentIdInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 9);
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  };

  // Sync profilePicturePreview with profile prop when it changes (after refresh)
  useEffect(() => {
    if (profile?.profilePictureUrl && !profilePictureFile) {
      setProfilePicturePreview(profile.profilePictureUrl);
    }
  }, [profile?.profilePictureUrl, profilePictureFile]);

  const handleProfilePictureChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File too large", {
          description: "Profile picture must be less than 5MB",
        });
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("Invalid file type", {
          description: "Please select an image file",
        });
        return;
      }

      setProfilePictureFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  async function handlePasswordChange() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All password fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      toast.error(
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      );
      return;
    }

    setIsChangingPassword(true);

    try {
      const result = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (result.success) {
        toast.success(result.message || "Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowPasswordModal(false);
      } else {
        toast.error(result.error || "Failed to change password");
      }
    } catch (err) {
      toast.error("An unexpected error occurred. Please try again.");
      console.error("Password change error:", err);
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function onSubmit(data: ProfileUpdateInput) {
    try {
      setIsLoading(true);
      setError(null);

      const formData = new FormData();

      // Add profile data
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value?.toString() || "");
      });

      // Add profile picture if selected
      if (profilePictureFile) {
        formData.append("profilePicture", profilePictureFile);
      }

      const { updateProfile } = await import("@/actions/profile/update");

      // Add timeout to prevent button from staying disabled indefinitely
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 30000),
      );

      const result = (await Promise.race([
        updateProfile(formData),
        timeoutPromise,
      ])) as Awaited<ReturnType<typeof updateProfile>>;

      if (result.success) {
        toast.success("Profile updated successfully!");

        // Reset file states
        setProfilePictureFile(null);

        // Update preview with new URL if profile picture was uploaded
        if (result.profilePictureUrl) {
          setProfilePicturePreview(result.profilePictureUrl);
        }

        updateUser({
          firstName: data.firstName,
          lastName: data.lastName,
          profilePictureUrl: result.profilePictureUrl ?? undefined,
        });

        // Force refresh the session to get updated profile data
        try {
          const sessionResponse = await fetch("/api/auth/session", {
            cache: "no-store",
          });
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            if (sessionData.user) {
              updateUser(sessionData.user);
            }
          }
        } catch (err) {
          console.error("Failed to refresh session:", err);
        }

        router.refresh();
      } else {
        const friendlyMessage =
          result.message === "Failed to upload profile picture"
            ? "We couldn't upload your profile photo. Please try again later or contact support if the issue persists."
            : result.message;

        setError(friendlyMessage);
        toast.error("Update failed", { description: friendlyMessage });
      }
    } catch (err) {
      const message =
        err instanceof Error && err.message === "Request timeout"
          ? "Request took too long. Please try again."
          : "An unexpected error occurred. Please try again.";
      setError(message);
      toast.error("Error", { description: message });
      console.error("Profile update error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const getInitials = () => {
    return `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();
  };

  // Check if basic info fields are complete
  const isBasicInfoComplete = () => {
    const firstName = form.watch("firstName");
    const lastName = form.watch("lastName");
    return !!(firstName && lastName);
  };

  // Check if academic fields are complete
  const isAcademicInfoComplete = () => {
    const studentId = form.watch("studentId");
    const department = form.watch("department");
    const campus = form.watch("campus");
    const course = form.watch("course");
    const yearLevel = form.watch("yearLevel");
    const section = form.watch("section");

    return !!(
      studentId &&
      studentId.match(/^\d{4}-\d{5}$/) && // Valid format
      department &&
      campus &&
      course &&
      yearLevel &&
      section
    );
  };

  const lastLoginDate = user.lastLoginAt ? new Date(user.lastLoginAt) : null;
  const lastLoginDisplay =
    lastLoginDate && !Number.isNaN(lastLoginDate.getTime())
      ? format(lastLoginDate, "MMM d, yyyy • h:mm a")
      : "Never logged in";

  return (
    <Tabs defaultValue="basic" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger
          value="basic"
          className={cn(
            !isBasicInfoComplete() &&
              "text-destructive data-[state=active]:text-destructive",
          )}
        >
          <span className="flex items-center gap-2">
            Basic Info & Picture
            {!isBasicInfoComplete() && <AlertCircle className="h-4 w-4" />}
          </span>
        </TabsTrigger>
        <TabsTrigger
          value="academic"
          className={cn(
            !isAcademicInfoComplete() &&
              "text-destructive data-[state=active]:text-destructive",
          )}
        >
          <span className="flex items-center gap-2">
            Academic & Documents
            {!isAcademicInfoComplete() && <AlertCircle className="h-4 w-4" />}
          </span>
        </TabsTrigger>
      </TabsList>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                {error === "Failed to upload profile picture"
                  ? "We couldn't upload your profile photo. Please try again later or contact support if the issue persists."
                  : error}
              </AlertDescription>
            </Alert>
          )}

          {/* Basic Information & Profile Picture Tab */}
          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Update your personal information and contact details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">
                      Role
                    </Label>
                    <Badge variant="outline" className="w-fit px-2 py-1">
                      {user.role}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">
                      Last Login
                    </Label>
                    <p className="text-sm font-medium">{lastLoginDisplay}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormFieldWrapper
                    name="firstName"
                    control={form.control}
                    label="First Name"
                    required
                  >
                    {(field) => (
                      <Input
                        {...field}
                        type="text"
                        placeholder="John"
                        disabled={isLoading}
                      />
                    )}
                  </FormFieldWrapper>

                  <FormFieldWrapper
                    name="lastName"
                    control={form.control}
                    label="Last Name"
                    required
                  >
                    {(field) => (
                      <Input
                        {...field}
                        type="text"
                        placeholder="Doe"
                        disabled={isLoading}
                      />
                    )}
                  </FormFieldWrapper>
                </div>

                <FormFieldWrapper
                  name="contactNumber"
                  control={form.control}
                  label="Contact Number"
                >
                  {(field) => (
                    <Input
                      value={formatPhoneNumberForDisplay(field.value || "")}
                      onChange={(e) => {
                        const formatted = formatPhoneNumberForDisplay(
                          e.target.value,
                        );
                        const unformatted =
                          formatPhoneNumberForStorage(formatted);
                        field.onChange(unformatted);
                      }}
                      type="tel"
                      placeholder="0912 345 6789"
                      disabled={isLoading}
                      maxLength={14}
                    />
                  )}
                </FormFieldWrapper>

                <div className="pt-2">
                  <Label className="text-sm text-muted-foreground">Email</Label>
                  <Input
                    type="email"
                    value={user.email}
                    disabled
                    className="mt-1.5 bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Email cannot be changed. Contact administrator if needed.
                  </p>
                </div>

                {/* Change Password Button */}
                <div className="pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPasswordModal(true)}
                    className="w-full"
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Profile Picture
                </CardTitle>
                <CardDescription>
                  Upload or update your profile picture (max 5MB)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="h-32 w-32">
                    <AvatarImage
                      src={
                        profilePicturePreview ||
                        profile?.profilePictureUrl ||
                        undefined
                      }
                    />
                    <AvatarFallback className="text-2xl">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex flex-col items-center gap-2">
                    <Label htmlFor="profile-picture" className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                        <Upload className="h-4 w-4" />
                        Choose Picture
                      </div>
                      <Input
                        id="profile-picture"
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePictureChange}
                        className="hidden"
                        disabled={isLoading}
                      />
                    </Label>
                    <p className="text-xs text-muted-foreground text-center">
                      Accepted formats: JPG, PNG, GIF (max 5MB)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Academic Information & Documents Tab */}
          <TabsContent value="academic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Academic Information
                </CardTitle>
                <CardDescription>
                  Update your academic details and student information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormFieldWrapper
                  name="studentId"
                  control={form.control}
                  label="Student ID"
                  description="Format: YEAR-00000 (e.g., 2022-00529)"
                  required
                >
                  {(field) => (
                    <Input
                      {...field}
                      value={field.value || ""}
                      type="text"
                      placeholder="2024-00000"
                      disabled={isLoading}
                      pattern="\d{4}-\d{5}"
                      maxLength={10}
                      onChange={(e) => {
                        const formatted = formatStudentIdInput(e.target.value);
                        field.onChange(formatted);
                      }}
                    />
                  )}
                </FormFieldWrapper>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormFieldWrapper
                    name="department"
                    control={form.control}
                    label="Department/Colleges"
                    description="Select your department or college"
                    required
                  >
                    {(field) => (
                      <Select
                        onValueChange={(value) => {
                          handleDepartmentChange(value);
                          form.setValue(
                            "department",
                            value as
                              | "CCIS"
                              | "COE"
                              | "CAS"
                              | "CAAS"
                              | "CTE"
                              | "COT",
                          );
                          form.setValue("course", "");
                          field.onChange(value);
                        }}
                        defaultValue={field.value}
                        value={field.value}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select department or college" />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            {
                              code: "CCIS",
                              name: "College of Computer and Information Sciences",
                            },
                            { code: "COE", name: "College of Engineering" },
                            {
                              code: "CAS",
                              name: "College of Arts and Sciences",
                            },
                            {
                              code: "CAAS",
                              name: "College of Agriculture and Applied Sciences",
                            },
                            {
                              code: "CTE",
                              name: "College of Teacher Education",
                            },
                            { code: "COT", name: "College of Technology" },
                          ].map((dept) => (
                            <SelectItem key={dept.code} value={dept.code}>
                              {dept.code} - {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </FormFieldWrapper>

                  <FormFieldWrapper
                    name="campus"
                    control={form.control}
                    label="Campus"
                    description="Select your campus location"
                    required
                  >
                    {(field) => (
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select campus" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MainCampus">
                            Main Campus
                          </SelectItem>
                          <SelectItem value="MalimonoCampus">
                            Malimono Campus
                          </SelectItem>
                          <SelectItem value="MainitCampus">
                            Mainit Campus
                          </SelectItem>
                          <SelectItem value="ClaverCampus">
                            Claver Campus
                          </SelectItem>
                          <SelectItem value="DelCarmenCampus">
                            Del Carmen Campus
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </FormFieldWrapper>
                </div>

                <FormFieldWrapper
                  name="course"
                  control={form.control}
                  label="Course/Program"
                  description="Select your program (select department first)"
                  required
                >
                  {(field) => (
                    <Select
                      onValueChange={(value) => {
                        if (value === "all") {
                          toast.error(
                            "Please select a specific course/program.",
                          );
                          return;
                        }

                        field.onChange(value);
                      }}
                      defaultValue={field.value}
                      value={field.value}
                      disabled={isLoading || !selectedDepartment}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select course/program" />
                      </SelectTrigger>
                      <SelectContent>
                        {courseOptions
                          .filter((option) => option.value !== "all")
                          .map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                </FormFieldWrapper>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormFieldWrapper
                    name="yearLevel"
                    control={form.control}
                    label="Year Level"
                    required
                  >
                    {(field) => (
                      <Input
                        {...field}
                        type="number"
                        min={1}
                        max={6}
                        placeholder="1"
                        disabled={isLoading}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value, 10))
                        }
                      />
                    )}
                  </FormFieldWrapper>

                  <FormFieldWrapper
                    name="section"
                    control={form.control}
                    label="Section"
                    required
                  >
                    {(field) => (
                      <Input
                        {...field}
                        type="text"
                        placeholder="A"
                        disabled={isLoading}
                      />
                    )}
                  </FormFieldWrapper>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.history.back()}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner className="mr-2" />
                  Saving changes...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </DialogTitle>
            <DialogDescription>
              Update your account password. Use a strong password with at least
              8 characters.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                disabled={isChangingPassword}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min. 8 characters)"
                disabled={isChangingPassword}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Must contain uppercase, lowercase, and number
              </p>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                disabled={isChangingPassword}
                className="mt-1.5"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowPasswordModal(false);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
              }}
              disabled={isChangingPassword}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handlePasswordChange}
              disabled={
                isChangingPassword ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
            >
              {isChangingPassword ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Changing...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
