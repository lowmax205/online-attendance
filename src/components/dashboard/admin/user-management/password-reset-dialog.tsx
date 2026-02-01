"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { resetUserPassword } from "@/actions/admin/users";

interface PasswordResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  userEmail: string;
}

export function PasswordResetDialog({
  open,
  onOpenChange,
  userId,
  userEmail,
}: PasswordResetDialogProps) {
  const { toast } = useToast();
  const [showConfirmation, setShowConfirmation] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);
  const [temporaryPassword, setTemporaryPassword] = React.useState<
    string | null
  >(null);
  const [copied, setCopied] = React.useState(false);

  // Show confirmation when dialog opens
  React.useEffect(() => {
    if (open && userId && !temporaryPassword) {
      setShowConfirmation(true);
    }
  }, [open, userId, temporaryPassword]);

  const handleReset = async () => {
    if (!userId) return;

    try {
      setIsResetting(true);
      const result = await resetUserPassword(userId);

      if (!result.success) {
        throw new Error(result.error || "Failed to reset password");
      }

      if (result.data?.temporaryPassword) {
        setTemporaryPassword(result.data.temporaryPassword);
      }

      toast({
        title: "Password reset",
        description: `Temporary password generated for ${userEmail}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to reset password",
        variant: "destructive",
      });
      onOpenChange(false);
    } finally {
      setIsResetting(false);
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
    setTemporaryPassword(null);
    setCopied(false);
    setShowConfirmation(false);
    onOpenChange(false);
  };

  const handleConfirmReset = () => {
    setShowConfirmation(false);
    handleReset();
  };

  // Auto-trigger removed - now we use confirmation dialog

  // Confirmation Dialog
  if (showConfirmation) {
    return (
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <AlertDialogTitle>Reset Password Confirmation</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to reset the password for:{" "}
                <span className="font-semibold">{userEmail}</span>
              </p>
              <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Important Information:
                </p>
                <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
                  <li>A 6-character alphabetic password will be generated</li>
                  <li>The password can only be used 3 times</li>
                  <li>After 3 logins, the account will be locked</li>
                  <li>User must change password in their profile settings</li>
                </ul>
              </div>
              <p className="text-sm">
                The temporary password will only be shown once. Make sure to
                save it before closing.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleClose}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReset}>
              Confirm Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // If showing temporary password
  if (temporaryPassword) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Password Reset Successfully</DialogTitle>
            <DialogDescription>
              Save the temporary password below. It will only be shown once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-muted p-4">
              <p className="mb-2 text-sm font-medium">User Email:</p>
              <p className="mb-4 rounded border bg-background p-2 font-mono text-sm">
                {userEmail}
              </p>

              <p className="mb-2 text-sm font-medium">Temporary Password:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded border bg-background p-3 font-mono text-lg font-bold text-center tracking-widest">
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

            <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-3 space-y-2">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Password Usage Rules:
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li>This password can be used for 3 logins only</li>
                <li>Account will lock after 3 logins if not changed</li>
                <li>User must change it in Profile Settings</li>
              </ul>
            </div>

            <p className="text-sm text-muted-foreground">
              Please provide this password to the user. They should change it
              immediately after their first login.
            </p>
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Loading state
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Resetting Password</DialogTitle>
          <DialogDescription>
            Generating temporary password for {userEmail}...
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>

        <DialogFooter>
          <Button
            onClick={handleClose}
            variant="outline"
            disabled={isResetting}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
