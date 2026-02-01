"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  attendanceVerifySchema,
  type AttendanceVerify,
} from "@/lib/validations/attendance-verification";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { verifyAttendance } from "@/actions/moderator/attendance";
import { Loader2 } from "lucide-react";
import { VerificationStatus } from "@prisma/client";

interface VerificationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attendanceId: string;
  onSuccess?: () => void;
}

export function VerificationForm({
  open,
  onOpenChange,
  attendanceId,
  onSuccess,
}: VerificationFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<AttendanceVerify>({
    resolver: zodResolver(attendanceVerifySchema),
    defaultValues: {
      status: VerificationStatus.Approved,
      disputeNotes: "",
      resolutionNotes: "",
    },
  });

  const watchStatus = form.watch("status");

  React.useEffect(() => {
    if (open) {
      form.reset({
        status: VerificationStatus.Approved,
        disputeNotes: "",
        resolutionNotes: "",
      });
    }
  }, [open, form]);

  const handleSubmit = async (data: AttendanceVerify) => {
    try {
      setIsSubmitting(true);

      const result = await verifyAttendance(attendanceId, data);

      if (!result.success) {
        throw new Error(result.error || "Failed to verify attendance");
      }

      toast({
        title: "Attendance verified",
        description: `Attendance has been ${data.status === VerificationStatus.Approved ? "approved" : "rejected"} successfully.`,
      });

      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to verify attendance",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Verify Attendance</DialogTitle>
          <DialogDescription>
            Review and approve or reject this attendance submission.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification Decision *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={VerificationStatus.Approved}
                          id="approve"
                        />
                        <Label
                          htmlFor="approve"
                          className="font-normal cursor-pointer"
                        >
                          Approve - Attendance is valid
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={VerificationStatus.Rejected}
                          id="reject"
                        />
                        <Label
                          htmlFor="reject"
                          className="font-normal cursor-pointer"
                        >
                          Reject - Attendance is invalid
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchStatus === VerificationStatus.Rejected && (
              <FormField
                control={form.control}
                name="disputeNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dispute Notes *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Explain why this attendance is being rejected..."
                        className="resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This note will be visible to the student and is required
                      for rejection.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="resolutionNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resolution Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes about this verification..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Internal notes for your reference (visible to other
                    moderators).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
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
                Submit Verification
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
