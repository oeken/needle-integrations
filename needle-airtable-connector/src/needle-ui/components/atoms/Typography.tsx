import { type BaseProps } from "~/needle-ui/models/react-models";

export function H1({ children, className }: BaseProps) {
  return (
    <h1 className={`text-4xl font-semibold tracking-tight ${className}`}>
      {children}
    </h1>
  );
}

export function H2({ children, className }: BaseProps) {
  return (
    <h2 className={`text-2xl font-semibold tracking-tight ${className}`}>
      {children}
    </h2>
  );
}

export function H3({ children, className }: BaseProps) {
  return (
    <h3 className={`text-xl font-semibold tracking-tight ${className}`}>
      {children}
    </h3>
  );
}
