import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { forwardRef, type Ref, type ReactNode } from "react";

import type { BaseProps } from "~/models/react-models";

type TooltipProps = BaseProps & {
  content: ReactNode;
};

export const Tooltip = forwardRef(
  (
    { content, className, children }: TooltipProps,
    ref: Ref<HTMLButtonElement>,
  ) => {
    return (
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger ref={ref} asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className={`flex flex-col gap-2 rounded border bg-zinc-50 px-2 py-0.5 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900 ${className}`}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-zinc-200 dark:fill-zinc-700" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    );
  },
);
Tooltip.displayName = "Tooltip";
