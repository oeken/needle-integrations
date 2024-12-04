import { type BaseProps } from "~/needle-ui/models/react-models";

type DividerProps = BaseProps & {
  type: "horizontal" | "vertical";
};

export function Divider({ type = "horizontal", className }: DividerProps) {
  if (type === "horizontal") {
    return (
      <div
        className={`h-[1px] w-full bg-zinc-200 dark:bg-zinc-700 ${className}`}
      ></div>
    );
  }
  return (
    <div
      className={`h-auto w-[1px] bg-zinc-200 dark:bg-zinc-700 ${className}`}
    />
  );
}
