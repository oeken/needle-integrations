import Link from "next/link";

import { getSession } from "~/utils/session-utils";
import { listCollections } from "@needle-ai/needle-sdk";

import { Footer } from "~/app/_components/atoms/Footer";
import { Header } from "~/app/_components/atoms/Header";
import { redirect } from "next/navigation";

type NotionPageProps = { searchParams: { accessToken?: string } };

export default async function NotionPage({ searchParams }: NotionPageProps) {
  const { user, session } = await getSession();
  const collections = await listCollections(session.id);
  let error;

  if (!searchParams.accessToken) {
    redirect(process.env.NOTION_OAUTH_URL ?? "");
  }

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
          <h1 className="text-5xl font-extrabold tracking-tight">
            Create Connector
          </h1>
          {error && <h2>Error: {error}</h2>}
        </div>
      </main>

      <Footer />
    </>
  );
}
