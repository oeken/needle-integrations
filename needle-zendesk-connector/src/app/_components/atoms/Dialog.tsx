import React, { useEffect, type PropsWithChildren } from "react";

interface DialogProps extends PropsWithChildren {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Dialog({ children, open, onOpenChange }: DialogProps) {
  // Handle ESC key press
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
      // Prevent scrolling when dialog is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50"
      onClick={(e) => {
        // Close dialog when clicking overlay
        if (e.target === e.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white shadow-lg">
        {children}
      </div>
    </div>
  );
}
