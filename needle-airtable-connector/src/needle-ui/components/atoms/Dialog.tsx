import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { BaseProps } from "~/needle-ui/models/react-models";
import { type ReactNode, useEffect, useState } from "react";
import { XIcon } from "lucide-react";
import { Tooltip } from "./Tooltip";
import { Button } from "./Button";

type PointerDownOutsideEvent = CustomEvent<{ originalEvent: PointerEvent }>;
type FocusOutsideEvent = CustomEvent<{ originalEvent: FocusEvent }>;

type DialogProps = BaseProps & {
  trigger: ReactNode;
  isOpen?: boolean;
  tooltipContent?: ReactNode;
  onOpenChange?: (open: boolean) => void;
  disableClose?: boolean;
};

export function Dialog({
  trigger,
  isOpen: initialIsOpen,
  tooltipContent,
  onOpenChange,
  disableClose = false,
  children,
}: DialogProps) {
  const [isOpen, setIsOpen] = useState(initialIsOpen);

  useEffect(() => {
    if (initialIsOpen !== isOpen) {
      setIsOpen(initialIsOpen);
    }
  }, [initialIsOpen, isOpen]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };

  const wrappedTrigger = tooltipContent ? (
    <Tooltip content={tooltipContent}>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
    </Tooltip>
  ) : (
    <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
  );

  const handleInteraction = (
    e: FocusOutsideEvent | PointerDownOutsideEvent | KeyboardEvent,
  ) => {
    if (disableClose) {
      e.preventDefault();
    }
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
      {wrappedTrigger}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed left-0 top-0 z-40 h-full w-full animate-show bg-black/70" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 flex w-full-with-padding max-w-3xl -translate-x-1/2 -translate-y-1/2 animate-showGrowXYCentered flex-col rounded-lg bg-white p-4 dark:border dark:border-zinc-800 dark:bg-black"
          onInteractOutside={handleInteraction}
          onEscapeKeyDown={handleInteraction}
        >
          <VisuallyHidden.Root asChild>
            <DialogPrimitive.Title />
          </VisuallyHidden.Root>

          {children}
          <DialogPrimitive.Close className="absolute right-4 top-4" asChild>
            <Button
              buttonType="ghost"
              color="black"
              className="!p-1"
              disabled={disableClose}
            >
              <XIcon />
            </Button>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
