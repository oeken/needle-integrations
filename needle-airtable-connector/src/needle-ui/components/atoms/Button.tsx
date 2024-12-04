import {
  forwardRef,
  type MouseEvent,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
} from "react";
import { LoaderIcon } from "lucide-react";

export type Color = "primary" | "black" | "zinc" | "red" | "blue";
export type ButtonType = "filled" | "ghost" | "underline" | "outlined";

const StyleClasses: Record<Color, Record<ButtonType, string>> = {
  primary: {
    filled: "text-white bg-primary-600 hover:bg-primary-700",
    ghost: "hover:bg-primary-100/20 hover:text-primary-600",
    underline: "text-primary-500 hover:underline",
    outlined:
      "border border-primary-600 text-primary-600 hover:bg-primary-600 hover:text-white",
  },
  black: {
    filled:
      "text-white bg-black hover:bg-black/90 dark:text-black dark:bg-white dark:hover:bg-zinc-200",
    ghost: "hover:bg-zinc-100 dark:hover:bg-zinc-900",
    underline: "text-black dark:text-white hover:underline",
    outlined:
      "border border-black text-black dark:border-white dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black",
  },
  zinc: {
    filled:
      "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800",
    ghost: "",
    underline: "",
    outlined:
      "border text-zinc-600 dark:border-zinc-500 dark:text-white dark:hover:bg-zinc-900 hover:bg-zinc-100",
  },
  red: {
    filled: "bg-red-600 text-white hover:bg-red-700",
    ghost: "text-red-600 hover:bg-red-50 dark:hover:bg-zinc-900",
    underline: "text-red-500 hover:underline",
    outlined:
      "border border-red-600 text-red-600 hover:bg-red-600 hover:text-white",
  },
  blue: {
    filled: "",
    ghost: "",
    underline: "text-blue-500 hover:underline",
    outlined: "",
  },
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  color?: Color;
  buttonType?: ButtonType;
  disabled?: boolean;
  isLoading?: boolean;
  setLoadingOnClick?: boolean;
  loadingPosition?: "left" | "right";
  loadingClassname?: string;
};

export const Button = forwardRef(
  (
    {
      color = "primary",
      buttonType = "filled",
      disabled = false,
      isLoading: initialIsLoading,
      setLoadingOnClick,
      loadingPosition = "left",
      loadingClassname,
      children,
      className,
      onClick,
      ...attrs
    }: ButtonProps,
    ref: React.Ref<HTMLButtonElement>,
  ) => {
    const [isLoading, setIsLoading] = useState(initialIsLoading);
    useEffect(() => {
      setIsLoading(initialIsLoading);
    }, [initialIsLoading]);
    const cc = StyleClasses[color][buttonType];
    const classes =
      disabled || isLoading
        ? cc.replace(/hover:\S*/g, "") + " opacity-50 cursor-not-allowed"
        : cc;
    const loadingClasses = color === "black" ? "invert" : "";

    const handleOnClick = setLoadingOnClick
      ? (e: MouseEvent<HTMLButtonElement>) => {
          setIsLoading(true);
          onClick?.(e);
        }
      : onClick;

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`flex flex-row items-center gap-2 rounded px-6 py-2 transition ${classes} ${className}`}
        onClick={handleOnClick}
        {...attrs}
      >
        {isLoading && loadingPosition === "left" && (
          <LoaderIcon
            size={16}
            className={`animate-spin ${loadingClasses} ${loadingClassname}`}
          />
        )}
        {children}
        {isLoading && loadingPosition === "right" && (
          <LoaderIcon
            size={16}
            className={`ml-auto animate-spin ${loadingClasses} ${loadingClassname}`}
          />
        )}
      </button>
    );
  },
);
Button.displayName = "Button";
