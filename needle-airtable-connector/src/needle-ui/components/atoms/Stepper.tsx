import { type ReactNode, useEffect, useState } from "react";
import { Divider } from "./Divider";

type StepperProps = {
  steps: string[];
  curStep?: number;
  className?: string;
  children: ReactNode[];
};

export function Stepper({
  steps,
  curStep: initialCurStep = 0,
  children,
  className,
}: StepperProps) {
  const [curStep, setCurStep] = useState(initialCurStep);
  useEffect(() => {
    setCurStep(initialCurStep);
  }, [initialCurStep]);

  return (
    <div className={`flex flex-row gap-x-2 ${className}`}>
      <div className="flex min-w-24 flex-col gap-2">
        {steps.map((s, i) => {
          const [circleColor, textColor] =
            i > curStep
              ? [
                  "bg-zinc-300 dark:bg-zinc-800",
                  "text-zinc-400 dark:text-zinc-700",
                ]
              : ["bg-black dark:bg-white", ""];

          return (
            <div key={i} className="flex flex-row items-center gap-1">
              <div
                className={`h-6 w-6 rounded-full ${circleColor} text-center font-semibold text-white dark:text-black`}
              >
                {i < curStep ? <span className="text-sm">✓</span> : i + 1}
              </div>
              <span className={`${textColor} font-semibold`}>{s}</span>
            </div>
          );
        })}
      </div>

      <Divider type="vertical" className="mx-2" />

      <div className="grow">{children[curStep]}</div>
    </div>
  );
}
