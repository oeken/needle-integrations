import * as ToastPrimitive from "@radix-ui/react-toast";
import { XIcon } from "lucide-react";
import { forwardRef, type ReactNode } from "react";
import { Button } from "./Button";

export type ToastProps = {
  title?: string;
  description: ReactNode;
  icon: ReactNode;
  action?: ReactNode;
  duration?: number;
};

export const Toast = forwardRef(
  (
    { title, description, icon, action, duration }: ToastProps,
    ref: React.Ref<HTMLLIElement>,
  ) => {
    return (
      <ToastPrimitive.Root
        ref={ref}
        duration={duration}
        className="m-4 flex min-w-96 flex-row items-center justify-between rounded border bg-zinc-50 px-4 shadow-md data-[state=closed]:animate-hide data-[state=open]:animate-showSlideLeft dark:border-zinc-800 dark:bg-zinc-900"
      >
        {icon}
        <div className="mr-auto flex flex-col px-4 py-3">
          {title && (
            <ToastPrimitive.Title className="font-bold">
              {title}
            </ToastPrimitive.Title>
          )}

          <ToastPrimitive.Description className="text-sm font-semibold text-zinc-500">
            {description}
          </ToastPrimitive.Description>

          {action && (
            <ToastPrimitive.Action altText="action" asChild>
              {action}
            </ToastPrimitive.Action>
          )}
        </div>
        <ToastPrimitive.Close asChild>
          <Button buttonType="ghost" color="black" className="!p-1">
            <XIcon />
          </Button>
        </ToastPrimitive.Close>
      </ToastPrimitive.Root>
    );
  },
);
Toast.displayName = "Toast";
