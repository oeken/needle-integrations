import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ReactNode } from "react";
import type { BaseProps } from "~/needle-ui/models/react-models";

type TabsProps = BaseProps & {
  tabs: { value: string; trigger: ReactNode; content: ReactNode }[];
};

export function Tabs2({ tabs, className }: TabsProps) {
  return (
    <TabsPrimitive.Root defaultValue={tabs[0]?.value} className="flex flex-col">
      <TabsPrimitive.List
        className={`mb-2 flex flex-row overflow-x-auto rounded border p-0.5 dark:border-zinc-700 ${className}`}
      >
        {tabs.map(({ value, trigger }) => (
          <TabsPrimitive.Trigger
            key={value}
            className="rounded-sm px-4 py-2 text-zinc-500 transition hover:bg-zinc-100 data-[state=active]:border-none data-[state=active]:bg-black data-[state=active]:font-semibold data-[state=active]:text-white dark:hover:bg-zinc-900 dark:data-[state=active]:bg-white dark:data-[state=active]:text-black"
            value={value}
          >
            {trigger}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>

      {tabs.map(({ value, content }) => (
        <TabsPrimitive.Content key={value} value={value}>
          {content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
