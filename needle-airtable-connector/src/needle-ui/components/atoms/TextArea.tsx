import { CircleAlertIcon, XIcon } from "lucide-react";
import { forwardRef, type TextareaHTMLAttributes } from "react";
import type { BaseProps } from "~/needle-ui/models/react-models";
import { Button } from "./Button";

type TextAreaProps = BaseProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    error?: string;
    onClear?: () => void;
  };

export const TextArea = forwardRef(
  (
    { error, onClear, className, ...attrs }: TextAreaProps,
    ref: React.Ref<HTMLTextAreaElement>,
  ) => {
    return (
      <div className={`flex flex-col ${className}`}>
        <div className="relative flex flex-col">
          <textarea
            ref={ref}
            className={`w-full rounded border-[1.5px] bg-inherit py-2 pl-2 pr-8 outline-none transition focus:border-black dark:border-zinc-800 dark:focus:border-zinc-100 ${className}`}
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
TextArea.displayName = "TextArea";
