"use client";

import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import type SignaturePad from "signature_pad";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PenTool, RotateCcw, Check } from "lucide-react";

interface SignatureCanvasComponentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignature: (base64Image: string) => void;
  value?: string | null;
}

/**
 * Signature canvas component
 * Allows user to draw signature and exports as transparent PNG
 */
export function SignatureCanvasComponent({
  open,
  onOpenChange,
  onSignature,
  value,
}: SignatureCanvasComponentProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [tempSignature, setTempSignature] = useState<string | null>(null);
  const hasPatchedSignaturePad = useRef(false);

  useEffect(() => {
    const canvasInstance = sigCanvas.current;
    if (!canvasInstance || hasPatchedSignaturePad.current) {
      return;
    }

    const signaturePad = canvasInstance.getSignaturePad() as SignaturePad & {
      _strokeUpdate: (event: PointerEvent | Touch | MouseEvent) => void;
      _strokeEnd: (event: PointerEvent | Touch | MouseEvent) => void;
      _data: unknown[];
    };
    const originalStrokeUpdate = signaturePad._strokeUpdate;
    const originalStrokeEnd = signaturePad._strokeEnd;
    const boundStrokeUpdate = originalStrokeUpdate.bind(signaturePad);
    const boundStrokeEnd = originalStrokeEnd.bind(signaturePad);

    signaturePad._strokeUpdate = function patchedStrokeUpdate(event) {
      if (!Array.isArray(this._data)) {
        this._data = [];
      }

      if (this._data.length === 0) {
        this._data.push([]);
      }

      return boundStrokeUpdate(event);
    };

    signaturePad._strokeEnd = function patchedStrokeEnd(event) {
      if (!Array.isArray(this._data) || this._data.length === 0) {
        return;
      }

      return boundStrokeEnd(event);
    };

    hasPatchedSignaturePad.current = true;

    return () => {
      signaturePad._strokeUpdate = originalStrokeUpdate;
      signaturePad._strokeEnd = originalStrokeEnd;
      hasPatchedSignaturePad.current = false;
    };
  }, []);

  // Load existing signature when dialog opens
  useEffect(() => {
    if (!open) return;

    const canvasInstance = sigCanvas.current;
    if (!canvasInstance) return;

    if (value) {
      try {
        canvasInstance.fromDataURL(value);
        setIsEmpty(false);
        setTempSignature(value);
      } catch (error) {
        console.error("Failed to load saved signature", error);
        try {
          canvasInstance.clear();
        } catch (clearError) {
          console.error("Failed to reset signature canvas", clearError);
        }
        setIsEmpty(true);
        setTempSignature(null);
      }
    } else {
      try {
        canvasInstance.clear();
      } catch (error) {
        console.error("Failed to clear signature canvas", error);
      }
      setIsEmpty(true);
      setTempSignature(null);
    }
  }, [open, value]);

  const handleClear = () => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
    setTempSignature(null);
  };

  const handleEnd = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      setIsEmpty(false);
      try {
        const dataUrl = sigCanvas.current.toDataURL("image/png");
        setTempSignature(dataUrl);
      } catch (error) {
        console.error("Failed to capture signature", error);
      }
    }
  };

  const handleSubmit = () => {
    if (tempSignature) {
      onSignature(tempSignature);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    // Restore original signature if user cancels
    if (value && sigCanvas.current) {
      try {
        sigCanvas.current.fromDataURL(value);
      } catch (error) {
        console.error("Failed to restore signature", error);
      }
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent
        className="sm:max-w-2xl"
        aria-describedby="signature-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" aria-hidden="true" />
            Digital Signature
          </DialogTitle>
          <DialogDescription id="signature-description">
            Sign in the box below using your finger or stylus
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Signature canvas */}
          <div
            className="relative rounded-lg border-2 border-dashed border-muted-foreground/25 bg-white dark:bg-slate-950"
            role="region"
            aria-label="Signature drawing area"
          >
            <SignatureCanvas
              ref={sigCanvas}
              canvasProps={{
                className: "w-full h-48 touch-none",
                style: { touchAction: "none" },
                "aria-label": "Draw your signature here",
                role: "img",
              }}
              backgroundColor="#ffffff"
              penColor="#000000"
              minWidth={1}
              maxWidth={3}
              onEnd={handleEnd}
            />

            {/* Empty state hint */}
            {isEmpty && !tempSignature && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                aria-hidden="true"
              >
                <p className="text-sm text-muted-foreground">Sign here</p>
              </div>
            )}
          </div>

          {/* Accessibility hints */}
          <div className="text-xs text-muted-foreground space-y-1" role="note">
            <p>• Use your finger or a stylus on touch devices</p>
            <p>• Draw your signature clearly within the box</p>
            <p>• Click &ldquo;Reset&rdquo; to clear and start over</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            aria-label="Cancel signature"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={isEmpty && !tempSignature}
            aria-label="Reset signature and start over"
          >
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            Reset
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isEmpty && !tempSignature}
            aria-label="Confirm and use this signature"
          >
            <Check className="mr-2 h-4 w-4" aria-hidden="true" />
            Use Signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
