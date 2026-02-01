"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form } from "@/components/ui/form";
import { FormFieldWrapper } from "@/components/form-field-wrapper";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
    },
  });

  async function onSubmit(data: RegisterInput) {
    setIsLoading(true);
    setError(null);

    try {
      const { register: registerAction } = await import(
        "@/actions/auth/register"
      );
      const result = await registerAction(data);

      if (result.success && result.user) {
        // Update auth context
        login({
          userId: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
          hasProfile: result.user.hasProfile,
          profilePictureUrl: result.user.profilePictureUrl ?? null,
        });

        toast.success("Registration successful!", {
          description: "Welcome! Please complete your profile.",
        });

        // Redirect to profile creation
        const redirectUrl = returnUrl
          ? `/profile/create?returnUrl=${encodeURIComponent(returnUrl)}`
          : "/profile/create";
        window.location.href = redirectUrl;
      } else {
        setError(result.message);
        toast.error("Registration failed", {
          description: result.message,
        });
      }
    } catch (err) {
      const message = "An unexpected error occurred. Please try again.";
      setError(message);
      toast.error("Error", { description: message });
      console.error("Registration error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

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
                placeholder="Juan"
                autoComplete="given-name"
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
                placeholder="Dela Cruz"
                autoComplete="family-name"
                disabled={isLoading}
              />
            )}
          </FormFieldWrapper>
        </div>

        <FormFieldWrapper
          name="email"
          control={form.control}
          label="Email Address"
          required
        >
          {(field) => (
            <Input
              {...field}
              type="email"
              placeholder="student@example.com"
              autoComplete="email"
              disabled={isLoading}
            />
          )}
        </FormFieldWrapper>

        <FormFieldWrapper
          name="password"
          control={form.control}
          label="Password"
          description="Must be at least 8 characters with uppercase and lowercase letters"
          required
        >
          {(field) => (
            <Input
              {...field}
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={isLoading}
            />
          )}
        </FormFieldWrapper>

        <FormFieldWrapper
          name="confirmPassword"
          control={form.control}
          label="Confirm Password"
          required
        >
          {(field) => (
            <Input
              {...field}
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={isLoading}
            />
          )}
        </FormFieldWrapper>

        <Button type="submit" className="w-full min-h-11" disabled={isLoading}>
          {isLoading ? (
            <>
              <Spinner className="mr-2" />
              Creating account...
            </>
          ) : (
            "Create Account"
          )}
        </Button>
      </form>
    </Form>
  );
}
