import { CircleAlertIcon, XIcon } from "lucide-react";
import { forwardRef, type InputHTMLAttributes } from "react";

import { Button } from "./Button";
import { type BaseProps } from "~/models/react-models";

type InputProps = BaseProps &
  InputHTMLAttributes<HTMLInputElement> & {
    error?: string;
    onClear?: () => void;
  };

export const Input = forwardRef(
  (
    { error, onClear, className, ...attrs }: InputProps,
    ref: React.Ref<HTMLInputElement>,
  ) => {
    return (
      <div className={`flex flex-col ${className}`}>
        <div className="relative flex flex-col">
          <input
            ref={ref}
            tabIndex={-1}
            className={`w-full rounded border-[1.5px] bg-inherit py-2 pl-2 pr-8 outline-none transition focus:border-black disabled:text-zinc-500/50 dark:border-zinc-800 dark:focus:border-zinc-100 ${className}`}
            {...attrs}
          />

          {onClear && (
            <Button
              buttonType="ghost"
              color="black"
              className="translate absolute right-2 top-1/2 -translate-y-1/2 !p-1"
              disabled={attrs.disabled}
              onClick={onClear}
            >
              <XIcon size={18} />
            </Button>
          )}
        </div>

        {error && (
          <span className="ml-1 mt-0.5 flex items-center gap-1 text-sm text-red-500">
            <CircleAlertIcon size={14} />
            {error}
          </span>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
