import { BaseProps } from "~/needle-ui/models/react-models";

export type Color = "green" | "blue" | "red" | "primary" | "zinc";

const colorClasses: Record<Color, string> = {
  green: "text-green-700 bg-green-100 dark:text-green-500 dark:bg-green-400/20",
  red: "text-red-700 bg-red-100 dark:text-red-500 dark:bg-red-400/20",
  blue: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-400/20",
  primary: "text-primary-600 bg-primary-100/20",
  zinc: "text-zinc-500-600 bg-zinc-100 dark:text-zinc-300 dark:bg-zinc-800",
};

type BadgeProps = BaseProps & {
  color?: Color;
};

export function Badge({ color, children, className }: BadgeProps) {
  const cc = color ? colorClasses[color] : colorClasses.green;
  return (
    <span className={`rounded px-2 font-semibold ${cc} ${className} `}>
      {children}
    </span>
  );
}
