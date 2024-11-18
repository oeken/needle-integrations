import Link from "next/link";
import { type Connector } from "@needle-ai/needle-sdk";

import { getSession } from "~/utils/session-utils";
import { api } from "~/trpc/server";
import { Header } from "~/app/_components/atoms/Header";
import { Footer } from "~/app/_components/atoms/Footer";
import { Button } from "../_components/atoms/Button";

export default async function ConnectorsPage() {
  const { user } = await getSession();
  const connectors = await api.connectors.list();

  return (
    <>
      <Header user={user} />
      <main className="flex grow flex-col">
        <div className="mx-auto flex w-full flex-col md:w-[700px]">
          <div className="flex w-full items-center justify-between">
            <h1 className="my-8 text-5xl font-extrabold tracking-tight">
              Connectors
            </h1>
            <Link href="/connectors/zendesk">
              <Button>Connect Zendesk</Button>
            </Link>
          </div>
          <ul className="flex flex-col gap-2">
            {connectors.map((connector) => (
              <ConnectorItem key={connector.id} connector={connector} />
            ))}
          </ul>
          {connectors.length === 0 && (
            <p className="mt-16 text-center text-sm text-gray-400">
              No connectors found.
            </p>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}

function ConnectorItem({ connector }: { connector: Connector }) {
  return (
    <li>
      <Link
        href={`/connectors/${connector.id}`}
        className="group flex flex-col rounded-md border border-gray-800 px-4 py-2 hover:cursor-pointer hover:bg-gray-900/50"
      >
        <div className="flex items-center">
          <h3 className="font-semibold">{connector.name}</h3>
          {connector.error && <span className="ml-auto text-red-600">✗</span>}
          {!connector.error && (
            <span className="ml-auto text-green-400">✓</span>
          )}
        </div>

        <div className="mt-1 flex items-center gap-2 text-sm text-gray-400">
          {connector.timezone}
          {", "}
          {connector.cron_job}
          <span className="ml-auto text-base group-hover:text-white">→</span>
        </div>
      </Link>
    </li>
  );
}
