"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form } from "@/components/ui/form";
import { FormFieldWrapper } from "@/components/form-field-wrapper";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginInput) {
    setIsLoading(true);
    setError(null);

    try {
      const { login: loginAction } = await import("@/actions/auth/login");
      const result = await loginAction(data);

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

        toast.success("Login successful!", {
          description: `Welcome back, ${result.user.firstName}!`,
        });

        // Redirect based on profile status
        if (!result.user.hasProfile) {
          const redirectUrl = returnUrl
            ? `/profile/create?returnUrl=${encodeURIComponent(returnUrl)}`
            : "/profile/create";
          window.location.href = redirectUrl;
        } else {
          window.location.href = returnUrl || "/dashboard";
        }
      } else {
        setError(result.message);
        toast.error("Login failed", {
          description: result.message,
        });
      }
    } catch (err) {
      const message = "An unexpected error occurred. Please try again.";
      setError(message);
      toast.error("Error", { description: message });
      console.error("Login error:", err);
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
          required
        >
          {(field) => (
            <Input
              {...field}
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isLoading}
            />
          )}
        </FormFieldWrapper>

        <Button type="submit" className="w-full min-h-11" disabled={isLoading}>
          {isLoading ? (
            <>
              <Spinner className="mr-2" />
              Logging in...
            </>
          ) : (
            "Log In"
          )}
        </Button>
      </form>
    </Form>
  );
}
