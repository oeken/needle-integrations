import Link from "next/link";
import { CreateConnectorForm } from "~/app/_components/CreateConnnectorForm";
import { getSession } from "~/utils/session-utils";
import { listCollections } from "@needle-ai/needle-sdk";

export default async function CreateConnectorPage() {
  const { user, session } = await getSession();
  const collections = await listCollections(session.id);

  return (
    <>
      <header className="flex justify-between">
        <p className="ml-auto p-2 text-sm">
          <span className="text-gray-400">Logged in as </span>
          <b>{user.email}</b>
        </p>
      </header>

      <main className="flex grow flex-col">
        <div className="mx-auto flex w-full flex-col md:w-[700px]">
          <Link
            href="/connectors"
            className="my-8 mr-auto font-semibold text-gray-400 hover:text-white hover:underline"
          >
            ← Back
          </Link>
          <h1 className="text-5xl font-extrabold tracking-tight">
            Create Connector
          </h1>

          <p className="my-4">
            Enter the URLs of the files and target collection to be synced.
          </p>

          <CreateConnectorForm collections={collections} />
        </div>
      </main>

      <footer className="py-2 text-center text-xs font-bold text-gray-400">
        © Needle
      </footer>
    </>
  );
}
