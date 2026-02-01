"use client";

import { useState } from "react";
import { useForm, type UseFormProps } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, type ProfileInput } from "@/lib/validations/auth";
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
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  formatPhoneNumberForDisplay,
  formatPhoneNumberForStorage,
} from "@/lib/utils/phone-formatter";

export function ProfileForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { selectedDepartment, courseOptions, handleDepartmentChange } =
    useAcademicPrograms();
  const { updateUser } = useAuth();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");

  const form = useForm<ProfileInput>({
    resolver: zodResolver(
      profileSchema,
    ) as UseFormProps<ProfileInput>["resolver"],
    defaultValues: {
      studentId: "",
      department: "" as unknown as
        | "CCIS"
        | "COE"
        | "CAS"
        | "CAAS"
        | "CTE"
        | "COT",
      course: "",
      yearLevel: 1,
      section: "",
      contactNumber: "",
    },
  } as UseFormProps<ProfileInput>);

  const formatStudentIdInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 9);
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  };

  async function onSubmit(data: ProfileInput) {
    setIsLoading(true);
    setError(null);

    try {
      const { createProfile } = await import("@/actions/profile/create");
      const result = await createProfile(data);

      if (result.success) {
        // Update auth context to reflect profile completion
        updateUser({ hasProfile: true });

        toast.success("Profile created successfully!", {
          description: returnUrl
            ? "Redirecting to your destination..."
            : "Redirecting to dashboard...",
        });

        // Redirect to dashboard or return URL
        setTimeout(() => {
          window.location.href = returnUrl || "/dashboard";
        }, 1000);
      } else {
        setError(result.message);
        toast.error("Profile creation failed", {
          description: result.message,
        });
      }
    } catch (err) {
      const message = "An unexpected error occurred. Please try again.";
      setError(message);
      toast.error("Error", { description: message });
      console.error("Profile creation error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

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
                    value as "CCIS" | "COE" | "CAS" | "CAAS" | "CTE" | "COT",
                  );
                  form.setValue("course", "");
                  field.onChange(value);
                }}
                value={field.value || ""}
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
                    { code: "CAS", name: "College of Arts and Sciences" },
                    {
                      code: "CAAS",
                      name: "College of Agriculture and Applied Sciences",
                    },
                    { code: "CTE", name: "College of Teacher Education" },
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
                  <SelectItem value="MainCampus">Main Campus</SelectItem>
                  <SelectItem value="MalimonoCampus">
                    Malimono Campus
                  </SelectItem>
                  <SelectItem value="MainitCampus">Mainit Campus</SelectItem>
                  <SelectItem value="ClaverCampus">Claver Campus</SelectItem>
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
                  toast.error("Please select a specific course/program.");
                  return;
                }

                field.onChange(value);
              }}
              defaultValue={field.value}
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
            description="Put your Year Level as a number between 1 to 6"
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
                onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
              />
            )}
          </FormFieldWrapper>

          <FormFieldWrapper
            name="section"
            control={form.control}
            label="Section"
            description="Put your Section (e.g., A, B, 1A, 2A)"
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

        <FormFieldWrapper
          name="contactNumber"
          control={form.control}
          label="Contact Number"
          description="Format: 0912 345 6789 or +63 912 345 6789"
        >
          {(field) => (
            <Input
              value={formatPhoneNumberForDisplay(field.value || "")}
              onChange={(e) => {
                const formatted = formatPhoneNumberForDisplay(e.target.value);
                const unformatted = formatPhoneNumberForStorage(formatted);
                field.onChange(unformatted);
              }}
              type="tel"
              placeholder="0912 345 6789"
              disabled={isLoading}
              maxLength={14}
            />
          )}
        </FormFieldWrapper>

        <Button type="submit" className="w-full min-h-11" disabled={isLoading}>
          {isLoading ? (
            <>
              <Spinner className="mr-2" />
              Creating profile...
            </>
          ) : (
            "Complete Profile"
          )}
        </Button>
      </form>
    </Form>
  );
}
