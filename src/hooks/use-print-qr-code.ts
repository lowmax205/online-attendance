import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

/**
 * Custom hook for printing QR codes using the event-print.html template
 * Eliminates duplication between components that need to print event QR codes
 */
export function usePrintQRCode(
  eventName: string,
  qrCodeUrl: string,
  shortUrl?: string | undefined,
  attendanceUrl?: string,
  eventCode?: string,
) {
  const { toast } = useToast();

  const handlePrint = useCallback(async () => {
    const finalAttendanceUrl = attendanceUrl || "N/A";
    const finalEventCode = eventCode || "N/A";

    try {
      const res = await fetch("/api/templates/event-print");
      if (!res.ok) throw new Error("Failed to load print template");
      let htmlContent = await res.text();

      // Replace placeholders with actual values
      const now = new Date();
      const generationDate = now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      htmlContent = htmlContent
        .replace(/{{TITLE}}/g, `QR Code - ${eventName}`)
        .replace(/{{EVENT_NAME}}/g, eventName)
        .replace(/{{QR_CODE_URL}}/g, qrCodeUrl)
        .replace(/{{ATTENDANCE_URL}}/g, finalAttendanceUrl)
        .replace(/{{EVENT_CODE}}/g, finalEventCode)
        .replace(/{{SYSTEM_LOGO}}/g, "/images/logo.svg")
        .replace(/{{UNIVERSITY_LOGO}}/g, "/images/USC-Logo.png")
        .replace(/{{GENERATION_DATE}}/g, `Generated on ${generationDate}`);

      // Open preview window with template (no auto print)
      const previewWindow = window.open("", "_blank");
      if (previewWindow) {
        previewWindow.document.write(htmlContent);
        previewWindow.document.close();
        previewWindow.focus();
      } else {
        throw new Error("Failed to open preview window");
      }

      toast({
        title: "Preview Opened",
        description:
          "QR code print preview opened. Use the browser's Print option.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to prepare print",
        variant: "destructive",
      });
    }
  }, [eventName, qrCodeUrl, attendanceUrl, eventCode, toast]);

  return { handlePrint };
}
