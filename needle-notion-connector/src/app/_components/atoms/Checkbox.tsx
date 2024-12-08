import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { forwardRef } from "react";
import { CheckIcon, MinusIcon } from "lucide-react";

type CheckboxProps = CheckboxPrimitive.CheckboxProps &
  React.RefAttributes<HTMLButtonElement>;

export const Checkbox = forwardRef(
  (props: CheckboxProps, ref: React.Ref<HTMLButtonElement>) => {
    const { className, ...rest } = props;
    return (
      <CheckboxPrimitive.Root
        className={`relative h-5 w-5 rounded-sm bg-zinc-200 dark:bg-zinc-600 ${className}`}
        ref={ref}
        {...rest}
      >
        <CheckboxPrimitive.Indicator className="absolute left-0 top-0 h-full w-full rounded-sm bg-black text-white dark:bg-white dark:text-black">
          {props.checked === "indeterminate" && (
            <MinusIcon className="h-5 w-5" />
          )}
          {props.checked === true && <CheckIcon className="h-5 w-5" />}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    );
  },
);
Checkbox.displayName = "Checkbox";
