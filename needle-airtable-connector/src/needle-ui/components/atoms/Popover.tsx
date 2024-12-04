import * as PopoverPrimitive from "@radix-ui/react-popover";
import { XIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { BaseProps } from "~/needle-ui/models/react-models";
import { Button } from "./Button";

type PopoverProps = BaseProps & {
  trigger: ReactNode;
};

export function Popover({ trigger, children }: PopoverProps) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className="animate-showGrow rounded-lg border bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
          sideOffset={5}
        >
          {children}
          <PopoverPrimitive.Close asChild className="absolute right-2 top-2">
            <Button buttonType="ghost" color="black" className="!p-0.5">
              <XIcon size={18} />
            </Button>
          </PopoverPrimitive.Close>
          <PopoverPrimitive.Arrow className="fill-zinc-200 dark:fill-zinc-700" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
