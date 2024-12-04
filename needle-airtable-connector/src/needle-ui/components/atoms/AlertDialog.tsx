import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import type { ReactNode } from "react";
import { Button } from "./Button";
import type { BaseProps } from "~/needle-ui/models/react-models";
import { Tooltip } from "./Tooltip";

type AlertDialogProps = BaseProps & {
  title: string;
  content: ReactNode;
  action: ReactNode;
  tooltipContent?: ReactNode;
};

export function AlertDialog({
  title,
  content,
  action,
  tooltipContent,
  children,
}: AlertDialogProps) {
  const trigger = tooltipContent ? (
    <Tooltip content={tooltipContent}>
      <AlertDialogPrimitive.Trigger asChild>
        {children}
      </AlertDialogPrimitive.Trigger>
    </Tooltip>
  ) : (
    <AlertDialogPrimitive.Trigger asChild>
      {children}
    </AlertDialogPrimitive.Trigger>
  );

  return (
    <AlertDialogPrimitive.Root>
      {trigger}
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed left-0 top-0 z-50 h-full w-full bg-black bg-opacity-50" />
        <AlertDialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-96 -translate-x-1/2 -translate-y-1/2 rounded-md bg-white p-4 shadow-lg dark:border dark:border-zinc-700 dark:bg-zinc-900">
          <AlertDialogPrimitive.Title className="text-lg font-bold">
            {title}
          </AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description className="my-4 text-sm">
            {content}
          </AlertDialogPrimitive.Description>
          <div className="mt-4 flex justify-end gap-x-1">
            <AlertDialogPrimitive.Cancel asChild>
              <Button buttonType="underline" color="black">
                Cancel
              </Button>
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action asChild>
              {action}
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
