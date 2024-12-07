import Link from "next/link";

import { api } from "~/trpc/server";
import { getSession } from "~/utils/session-utils";

import { Footer } from "~/app/_components/atoms/Footer";
import { Header } from "~/app/_components/atoms/Header";
import { DeleteConnectorButton } from "~/app/_components/DeleteConnectorButton";
import { RunConnectorButton } from "~/app/_components/RunConnectorButton";
import {
  NotionConnectorPreview,
  type NotionPreviewData,
} from "~/app/_components/NotionConnectorPreview";

type ConnectorPageProps = { params: { connectorId: string } };

export default async function ConnectorPage({
  params: { connectorId },
}: ConnectorPageProps) {
  const { user } = await getSession();
  const connector = await api.connectors.get({ connectorId });

  const previewData: NotionPreviewData[] = connector.files.map((f) => ({
    id: f.notionPageId,
    object: "page",
    title: "",
    url: f.notionUrl,
  }));

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

            <RunConnectorButton connectorId={connectorId} />

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

          <div className="mb-4 w-full">
            <NotionConnectorPreview pages={previewData} />
          </div>

          <DeleteConnectorButton connectorId={connectorId} />
        </div>
      </main>

      <Footer />
    </>
  );
}
