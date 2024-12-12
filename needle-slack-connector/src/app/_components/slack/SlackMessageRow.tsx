import { formatDateTime } from "~/utils/format-date-time";

interface SlackMessage {
  ts: string;
  channelName: string;
  text: string;
}

export function SlackMessageRow({ message }: { message: SlackMessage }) {
  return (
    <div className="rounded-md border border-zinc-200 p-4 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              #{message.channelName}
            </span>
          </div>
          <span className="text-sm text-zinc-500">
            {formatDateTime(new Date(Number(message.ts) * 1000).toISOString())}
          </span>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {message.text}
        </p>
      </div>
    </div>
  );
}
