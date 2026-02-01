"use client";

// Wrapper around sonner toast for consistency with shadcn/ui patterns
import { useCallback, useMemo } from "react";
import { toast as sonnerToast } from "sonner";

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function useToast() {
  const toast = useCallback(({ title, description, variant }: ToastOptions) => {
    if (variant === "destructive") {
      sonnerToast.error(title, {
        description,
      });
    } else {
      sonnerToast(title, {
        description,
      });
    }
  }, []);

  // Memoise the returned object so callers can safely list `toast` in dependencies.
  return useMemo(() => ({ toast }), [toast]);
}
