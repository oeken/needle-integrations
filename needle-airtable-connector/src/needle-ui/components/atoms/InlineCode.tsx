import type { BaseProps } from "~/needle-ui/models/react-models";

export function InlineCode({ children }: BaseProps) {
  return (
    <code className="rounded bg-zinc-200 px-1 text-sm dark:bg-zinc-600">
      {children}
    </code>
  );
}
