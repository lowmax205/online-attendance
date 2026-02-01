"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QrCode, ExternalLink, Printer, Copy, CheckIcon } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";

interface QRCodeModalProps {
  eventId: string;
  eventName: string;
  qrCodeUrl: string;
}

export function QRCodeModal({
  eventId,
  eventName,
  qrCodeUrl,
}: QRCodeModalProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const attendanceUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/attendance/${eventId}`;

  const handleCopyUrl = async () => {
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

    const success = await copyToClipboard(attendanceUrl);

    if (success) {
      setCopied(true);
      toast({
        title: "URL Copied",
        description: "Attendance URL has been copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast({
        title: "Copy Failed",
        description: "Failed to copy URL to clipboard",
        variant: "destructive",
      });
    }
  };

  const handlePrint = () => {
    // Create a new window for printing
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>QR Code - ${eventName}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 2rem;
                margin: 0;
              }
              h1 {
                font-size: 1.5rem;
                margin-bottom: 1rem;
                text-align: center;
              }
              img {
                max-width: 400px;
                height: auto;
                margin: 1rem 0;
              }
              p {
                font-size: 0.875rem;
                color: #666;
                text-align: center;
                margin-top: 1rem;
              }
              @media print {
                body {
                  padding: 0;
                }
              }
            </style>
          </head>
          <body>
            <h1>${eventName}</h1>
            <img src="${qrCodeUrl}" alt="QR Code for ${eventName}" />
            <p>Scan this QR code to mark attendance</p>
            <p>${attendanceUrl}</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();

      // Wait for image to load before printing
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const handleGoToUrl = () => {
    window.open(attendanceUrl, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <QrCode className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code</DialogTitle>
          <DialogDescription>{eventName}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* QR Code Image */}
          <div className="relative w-full max-w-[300px] aspect-square bg-white p-4 rounded-lg border">
            <Image
              src={qrCodeUrl}
              alt={`QR Code for ${eventName}`}
              fill
              className="object-contain p-2"
              unoptimized
            />
          </div>

          {/* URL Display */}
          <div className="w-full">
            <p className="text-xs text-muted-foreground text-center break-all px-2">
              {attendanceUrl}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleGoToUrl}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Go to URL
            </Button>
            <Button variant="outline" className="flex-1" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCopyUrl}
            >
              {copied ? (
                <>
                  <CheckIcon className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy URL
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
