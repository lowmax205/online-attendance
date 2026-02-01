import { getTempPasswordWarning } from "@/actions/auth/get-temp-password-warning";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

/**
 * Temporary Password Warning Banner
 * Displays a warning if user is using a temporary password with limited attempts remaining
 * Server component - fetches warning status on render
 */
export async function TempPasswordWarning() {
  const warning = await getTempPasswordWarning();

  if (!warning) {
    return null;
  }

  return (
    <div className="mb-6 rounded-lg border border-amber-500 bg-amber-50 dark:bg-amber-950/20 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            {warning}
          </p>
          <Link
            href="/profile"
            className="inline-flex text-sm font-medium text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 underline underline-offset-4"
          >
            Change password now →
          </Link>
        </div>
      </div>
    </div>
  );
}
