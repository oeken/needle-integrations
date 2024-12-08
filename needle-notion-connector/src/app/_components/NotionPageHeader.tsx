import Image from "next/image";

export function NotionPageHeader() {
  return (
    <div className="border-b bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto my-12 flex w-full flex-col gap-1 px-4 xl:max-w-[50%] 2xl:max-w-[75%]">
        <Image alt="Notion" width="50" height="50" src="/images/notion.svg" />
        <h1 className="text-4xl font-semibold tracking-tight">
          Notion Connector
        </h1>
        <span className="text-zinc-500">
          Synchronize databases and pages from your Notion account.
        </span>
      </div>
    </div>
  );
}
