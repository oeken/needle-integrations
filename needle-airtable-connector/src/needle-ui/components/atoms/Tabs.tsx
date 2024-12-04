import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ReactNode } from "react";
import type { BaseProps } from "~/needle-ui/models/react-models";

type TabsProps = BaseProps & {
  tabs: { value: string; trigger: ReactNode; content: ReactNode }[];
};

export function Tabs({ tabs, className }: TabsProps) {
  return (
    <TabsPrimitive.Root defaultValue={tabs[0]?.value}>
      <TabsPrimitive.List
        className={`mb-2 flex flex-row overflow-x-auto border-b dark:border-zinc-700 ${className}`}
      >
        {tabs.map(({ value, trigger }) => (
          <TabsPrimitive.Trigger
            key={value}
            className="px-4 py-2 text-zinc-500 hover:bg-primary-100/10 data-[state=active]:border-b-2 data-[state=active]:border-primary-500 data-[state=active]:font-semibold data-[state=active]:text-primary-600"
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
