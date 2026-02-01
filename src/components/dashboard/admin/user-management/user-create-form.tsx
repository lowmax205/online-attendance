"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormFieldWrapper } from "@/components/form-field-wrapper";
import { useToast } from "@/hooks/use-toast";
import { useAcademicPrograms } from "@/hooks/use-academic-programs";
import { createUser } from "@/actions/admin/users";
import { userCreateSchema } from "@/lib/validations/user-management";
import { Role } from "@prisma/client";
import { z } from "zod";
import { Loader2, Copy, Check } from "lucide-react";

interface UserCreateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function UserCreateForm({
  open,
  onOpenChange,
  onSuccess,
}: UserCreateFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [temporaryPassword, setTemporaryPassword] = React.useState<
    string | null
  >(null);
  const [copied, setCopied] = React.useState(false);
  const { selectedDepartment, courseOptions, handleDepartmentChange } =
    useAcademicPrograms();

  const form = useForm<z.infer<typeof userCreateSchema>>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      email: "",
      role: Role.Student,
      studentNumber: "",
      firstName: "",
      lastName: "",
      department: "CCIS" as unknown as
        | "CCIS"
        | "COE"
        | "CAS"
        | "CAAS"
        | "CTE"
        | "COT",
      course: "",
      yearLevel: 1,
      section: "",
      campus: "MainCampus",
    },
  });

  const selectedRole = form.watch("role");

  // Reset student-specific fields when role changes to non-Student
  React.useEffect(() => {
    if (selectedRole !== Role.Student) {
      form.setValue("studentNumber", "");
      form.setValue(
        "department",
        "CCIS" as unknown as "CCIS" | "COE" | "CAS" | "CAAS" | "CTE" | "COT",
      );
      form.setValue("course", "");
      form.setValue("yearLevel", 1);
      form.setValue("section", "");
      form.setValue("campus", "MainCampus");
      handleDepartmentChange("");
    }
  }, [selectedRole, form, handleDepartmentChange]);

  const handleSubmit = async (values: z.infer<typeof userCreateSchema>) => {
    try {
      setIsSubmitting(true);

      // Clean up data for non-Student roles
      const cleanedValues = {
        ...values,
        // For non-Student roles, set student-specific fields to undefined
        ...(values.role !== Role.Student && {
          studentNumber: undefined,
          department: undefined,
          course: undefined,
          yearLevel: undefined,
          section: undefined,
          campus: undefined,
        }),
      };

      const result = await createUser(cleanedValues);

      if (!result.success) {
        throw new Error(result.error || "Failed to create user");
      }

      // Show success toast immediately
      toast({
        title: "User created",
        description: `${values.email} has been created successfully`,
      });

      if (result.data?.temporaryPassword) {
        setTemporaryPassword(result.data.temporaryPassword);
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPassword = async () => {
    if (temporaryPassword) {
      const copyToClipboard = async (text: string) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          try {
            await navigator.clipboard.writeText(text);
            return true;
          } catch (err) {
            console.warn("Clipboard API failed, trying fallback...", err);
          }
        }

        try {
          const textArea = document.createElement("textarea");
          textArea.value = text;
          textArea.style.position = "fixed";
          textArea.style.left = "-9999px";
          textArea.style.top = "0";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          const successful = document.execCommand("copy");
          document.body.removeChild(textArea);
          return successful;
        } catch (err) {
          console.error("Fallback copy failed", err);
          return false;
        }
      };

      const success = await copyToClipboard(temporaryPassword);

      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({
          title: "Copied",
          description: "Temporary password copied to clipboard",
        });
      } else {
        toast({
          title: "Copy Failed",
          description: "Failed to copy password to clipboard",
          variant: "destructive",
        });
      }
    }
  };

  const handleClose = () => {
    form.reset();
    setTemporaryPassword(null);
    setCopied(false);
    onOpenChange(false);
    // Call onSuccess to refresh the user list after closing
    onSuccess();
  };

  // If temporary password is shown, display it
  if (temporaryPassword) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>User Created Successfully</DialogTitle>
            <DialogDescription>
              Save the temporary password below. It will only be shown once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border p-4 bg-muted">
              <p className="text-sm font-medium mb-2">Temporary Password:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-background rounded border font-mono text-sm">
                  {temporaryPassword}
                </code>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleCopyPassword}
                  aria-label="Copy password"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Please provide this password to the user. They should change it
              after their first login.
            </p>
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Add a new user to the system. A temporary password will be
            generated.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <FormFieldWrapper
              name="email"
              control={form.control}
              label="Email"
              description="User email address"
              required
            >
              {(field) => (
                <Input
                  {...field}
                  type="email"
                  placeholder="user@example.com"
                  disabled={isSubmitting}
                />
              )}
            </FormFieldWrapper>

            <FormFieldWrapper
              name="role"
              control={form.control}
              label="Role"
              description="Select user role"
              required
            >
              {(field) => (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Role.Student}>Student</SelectItem>
                    <SelectItem value={Role.Moderator}>Moderator</SelectItem>
                    <SelectItem value={Role.Administrator}>
                      Administrator
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </FormFieldWrapper>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormFieldWrapper
                name="firstName"
                control={form.control}
                label="First Name"
                description="User first name"
                required
              >
                {(field) => (
                  <Input
                    {...field}
                    type="text"
                    placeholder="John"
                    disabled={isSubmitting}
                  />
                )}
              </FormFieldWrapper>

              <FormFieldWrapper
                name="lastName"
                control={form.control}
                label="Last Name"
                description="User last name"
                required
              >
                {(field) => (
                  <Input
                    {...field}
                    type="text"
                    placeholder="Doe"
                    disabled={isSubmitting}
                  />
                )}
              </FormFieldWrapper>
            </div>

            {selectedRole === Role.Student && (
              <>
                <FormFieldWrapper
                  name="studentNumber"
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
                      disabled={isSubmitting}
                      pattern="\d{4}-\d{5}"
                      maxLength={10}
                      onChange={(e) => {
                        const digits = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 9);
                        const formatted =
                          digits.length <= 4
                            ? digits
                            : `${digits.slice(0, 4)}-${digits.slice(4)}`;
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
                        value={field.value || ""}
                        disabled={isSubmitting}
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
                        disabled={isSubmitting}
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
                          toast({
                            title: "Error",
                            description:
                              "Please select a specific course/program.",
                            variant: "destructive",
                          });
                          return;
                        }
                        field.onChange(value);
                      }}
                      defaultValue={field.value}
                      disabled={isSubmitting || !selectedDepartment}
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
                        disabled={isSubmitting}
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
                    description="Put your Section (e.g., A, B, 1A, 2A)"
                    required
                  >
                    {(field) => (
                      <Input
                        {...field}
                        type="text"
                        placeholder="A"
                        disabled={isSubmitting}
                      />
                    )}
                  </FormFieldWrapper>
                </div>
              </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create User
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
