import Image from "next/image";

export function SlackConnectorHeader() {
  return (
    <div className="border-b bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto my-12 flex w-full flex-col gap-1 px-4 xl:max-w-[50%] 2xl:max-w-[75%]">
        <Image alt="Slack" width="24" height="24" src="/icons/slack.svg" />
        <h1 className="text-4xl font-semibold tracking-tight">
          Slack Connector
        </h1>
        <span className="text-zinc-500">
          Synchronize messages and channels from your Slack workspace.
        </span>
      </div>
    </div>
  );
}
