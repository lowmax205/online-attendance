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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { updateUserRole } from "@/actions/admin/users";
import { updateUserStatus } from "@/actions/admin/users";
import { updateUserEmail } from "@/actions/admin/users";
import {
  userRoleUpdateSchema,
  userStatusUpdateSchema,
  userEmailUpdateSchema,
} from "@/lib/validations/user-management";
import { Role, AccountStatus } from "@prisma/client";
import { z } from "zod";
import { Loader2 } from "lucide-react";

interface UserEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentRole: Role;
  currentStatus: AccountStatus;
  currentUserEmail: string;
  isCurrentUser: boolean;
  onSuccess: () => void;
}

type EditMode = "role" | "status" | "email";

export function UserEditDialog({
  open,
  onOpenChange,
  userId,
  currentRole,
  currentStatus,
  currentUserEmail,
  isCurrentUser,
  onSuccess,
}: UserEditDialogProps) {
  const { toast } = useToast();
  const [editMode, setEditMode] = React.useState<EditMode>("role");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const roleForm = useForm<z.infer<typeof userRoleUpdateSchema>>({
    // @ts-expect-error - React Hook Form type complexity with Zod resolver
    resolver: zodResolver(userRoleUpdateSchema),
    defaultValues: {
      role: currentRole,
      confirmSelfChange: false,
    },
  });

  const statusForm = useForm<z.infer<typeof userStatusUpdateSchema>>({
    resolver: zodResolver(userStatusUpdateSchema),
    defaultValues: {
      accountStatus: currentStatus,
      reason: "",
    },
  });

  const emailForm = useForm<z.infer<typeof userEmailUpdateSchema>>({
    resolver: zodResolver(userEmailUpdateSchema),
    defaultValues: {
      email: currentUserEmail,
      reason: "",
    },
  });

  // Reset forms when dialog opens or currentRole/Status/Email changes
  React.useEffect(() => {
    roleForm.reset({ role: currentRole, confirmSelfChange: false });
    statusForm.reset({ accountStatus: currentStatus, reason: "" });
    emailForm.reset({ email: currentUserEmail, reason: "" });
  }, [
    currentRole,
    currentStatus,
    currentUserEmail,
    roleForm,
    statusForm,
    emailForm,
  ]);

  const handleRoleSubmit = async (
    values: z.infer<typeof userRoleUpdateSchema>,
  ) => {
    try {
      setIsSubmitting(true);
      const result = await updateUserRole(userId, values);

      if (!result.success) {
        throw new Error(result.error || "Failed to update role");
      }

      toast({
        title: "Role updated",
        description: `User role changed to ${values.role}`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update role",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusSubmit = async (
    values: z.infer<typeof userStatusUpdateSchema>,
  ) => {
    try {
      setIsSubmitting(true);
      const result = await updateUserStatus(userId, values);

      if (!result.success) {
        throw new Error(result.error || "Failed to update status");
      }

      toast({
        title: "Status updated",
        description: `Account status changed to ${values.accountStatus}`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSubmit = async (
    values: z.infer<typeof userEmailUpdateSchema>,
  ) => {
    try {
      setIsSubmitting(true);
      const result = await updateUserEmail(userId, values);

      if (!result.success) {
        throw new Error(result.error || "Failed to update email");
      }

      toast({
        title: "Email updated",
        description: `User email changed to ${values.email}`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update email",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user role or account status for {currentUserEmail}
          </DialogDescription>
        </DialogHeader>

        {/* Mode Toggle */}
        <div className="flex gap-2 border-b pb-2">
          <Button
            variant={editMode === "role" ? "default" : "ghost"}
            size="sm"
            onClick={() => setEditMode("role")}
            type="button"
          >
            Change Role
          </Button>
          <Button
            variant={editMode === "status" ? "default" : "ghost"}
            size="sm"
            onClick={() => setEditMode("status")}
            type="button"
          >
            Change Status
          </Button>
          <Button
            variant={editMode === "email" ? "default" : "ghost"}
            size="sm"
            onClick={() => setEditMode("email")}
            type="button"
          >
            Change Email
          </Button>
        </div>

        {/* Role Form */}
        {editMode === "role" && (
          <Form {...roleForm}>
            <form
              // @ts-expect-error - React Hook Form submit handler type inference limitation
              onSubmit={roleForm.handleSubmit(handleRoleSubmit)}
              className="space-y-4"
            >
              <FormField
                // @ts-expect-error - React Hook Form control type inference with Zod
                control={roleForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={Role.Student}>Student</SelectItem>
                        <SelectItem value={Role.Moderator}>
                          Moderator
                        </SelectItem>
                        <SelectItem value={Role.Administrator}>
                          Administrator
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isCurrentUser && (
                <FormField
                  // @ts-expect-error - React Hook Form control type inference with Zod
                  control={roleForm.control}
                  name="confirmSelfChange"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Confirm Self-Change</FormLabel>
                        <FormDescription>
                          You are changing your own role. This may affect your
                          permissions.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Role
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}

        {/* Status Form */}
        {editMode === "status" && (
          <Form {...statusForm}>
            <form
              onSubmit={statusForm.handleSubmit(handleStatusSubmit)}
              className="space-y-4"
            >
              <FormField
                control={statusForm.control}
                name="accountStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={AccountStatus.ACTIVE}>
                          Active
                        </SelectItem>
                        <SelectItem value={AccountStatus.SUSPENDED}>
                          Suspended
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={statusForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter reason for status change..."
                        className="resize-none"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide a reason for the status change
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Status
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}

        {/* Email Form */}
        {editMode === "email" && (
          <Form {...emailForm}>
            <form
              onSubmit={emailForm.handleSubmit(handleEmailSubmit)}
              className="space-y-4"
            >
              <FormField
                control={emailForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="user@example.com"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the new email address for this user
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={emailForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter reason for email change..."
                        className="resize-none"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide a reason for the email change (e.g., correction,
                      user request)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Email
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
