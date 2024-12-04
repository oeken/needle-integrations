import * as SwitchPrimitive from "@radix-ui/react-switch";
import { forwardRef } from "react";

type SwitchProps = SwitchPrimitive.SwitchProps &
  React.RefAttributes<HTMLButtonElement>;

export const Switch = forwardRef(
  (props: SwitchProps, ref: React.Ref<HTMLButtonElement>) => {
    return (
      <SwitchPrimitive.Root
        ref={ref}
        {...props}
        className="relative h-4 w-8 rounded-full bg-zinc-300 transition data-[state=checked]:bg-black"
      >
        <SwitchPrimitive.Thumb className="absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white transition data-[state=checked]:translate-x-4" />
      </SwitchPrimitive.Root>
    );
  },
);
Switch.displayName = "Switch";
