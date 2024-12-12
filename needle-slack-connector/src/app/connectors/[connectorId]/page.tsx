import Link from "next/link";

import { api } from "~/trpc/server";
import { getSession } from "~/utils/session-utils";

import { Footer } from "~/app/_components/atoms/Footer";
import { Header } from "~/app/_components/atoms/Header";
import { DeleteConnectorButton } from "~/app/_components/DeleteConnectorButton";

interface ConnectorPageProps {
  params: {
    connectorId: string;
  };
}

export default async function ConnectorPage({
  params: { connectorId },
}: ConnectorPageProps) {
  const { user } = await getSession();
  const connector = await api.connectors.get({ connectorId });

  // Create a map of channel IDs to names for easy lookup
  const channelMap = new Map(
    connector.channelInfo?.map((channel) => [channel.id, channel.name]),
  );

  return (
    <>
      <Header user={user} />
      <main className="flex grow flex-col">
        <div className="mx-auto flex w-full flex-col md:w-[700px]">
          <Link
            href="/connectors"
            className="my-8 mr-auto font-semibold text-gray-400 hover:text-white hover:underline"
          >
            ← Back
          </Link>
          <div className="flex items-center">
            <h1 className="text-5xl font-extrabold tracking-tight">
              {connector.name}
            </h1>

            {connector.error && (
              <span className="ml-auto text-3xl text-red-600">✗</span>
            )}
            {!connector.error && (
              <span className="ml-auto text-3xl text-green-400">✓</span>
            )}
          </div>
          <div className="flex border-b border-gray-700 py-1 pl-2 text-sm text-gray-400">
            {connector.timezone}
            {", "}
            {connector.cron_job}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 px-2">
            <span className="text-sm font-bold">Files: </span>
            {connector.canvases.map((file) => (
              <span
                className="rounded-md border border-blue-400 px-2 text-sm text-blue-300 hover:bg-blue-400 hover:text-black"
                key={file.id}
              >
                ↗ {file.title} (#{channelMap.get(file.channelId)})
              </span>
            ))}
            {connector.messages.map((file) => (
              <span
                className="rounded-md border border-blue-400 px-2 text-sm text-blue-300 hover:bg-blue-400 hover:text-black"
                key={file.id}
              >
                {`slack://messages?channel=${channelMap.get(file.channelId)}&start_time=${file.monthStart}&end_time=${file.monthEnd}`}
              </span>
            ))}
          </div>
          <DeleteConnectorButton connectorId={connectorId} />
        </div>
      </main>
      <Footer />
    </>
  );
}
