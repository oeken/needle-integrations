import { type BaseProps } from "~/needle-ui/models/react-models";

type Color = "black" | "yellow" | "red";

const StyleClasses: Record<Color, string> = {
  black:
    "border-l-4 border-black bg-zinc-50 px-4 py-2 dark:border-white dark:bg-zinc-900",
  yellow:
    "border-l-4 bg-yellow-50 px-4 py-2 border-yellow-600 bg-yellow-50 dark:border-yellow-400 dark:bg-yellow-950",
  red: "border-l-4 bg-red-50 px-4 py-2 border-red-600 bg-red-50 dark:border-red-400 dark:bg-red-950",
};

type QuoteProps = BaseProps & {
  color: Color;
};

export function Quote({ color, className, children }: QuoteProps) {
  const classes = StyleClasses[color];
  return <div className={`${classes} ${className}`}>{children}</div>;
}
