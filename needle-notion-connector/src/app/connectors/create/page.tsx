import Link from "next/link";

import { getSession } from "~/utils/session-utils";
import { listCollections } from "@needle-ai/needle-sdk";

import { Footer } from "~/app/_components/atoms/Footer";
import { Header } from "~/app/_components/atoms/Header";
import { redirect } from "next/navigation";
import { env } from "~/env";
import { Client as NotionClient } from "@notionhq/client";
import { CreateConnectorForm } from "~/app/_components/CreateConnnectorForm";
import { NotionPageHeader } from "~/app/_components/NotionPageHeader";
import { fetchAccessToken } from "~/utils/notion-utils";

type NotionPageProps = { searchParams: { code?: string; state?: string } };

export default async function NotionPage({ searchParams }: NotionPageProps) {
  const { user, session } = await getSession();
  const collections = await listCollections(session.id);

  if (!searchParams.code) {
    redirect(env.NOTION_OAUTH_URL);
  }

  const token = await fetchAccessToken(searchParams.code).catch(() =>
    redirect("/error?message=unauthorized"),
  );
  if (!token) {
    return redirect("/error?message=missing-access-token");
  }

  const notion = new NotionClient({ auth: token.access_token });
  const searchResponse = await notion.search({});

  return (
    <>
      <Header user={user} />

      <NotionPageHeader />

      <main className="flex grow flex-col">
        <div className="mx-auto flex w-full flex-col md:w-[700px]">
          <Link
            href="/connectors"
            className="my-8 mr-auto font-semibold text-gray-400 hover:text-white hover:underline"
          >
            ← Back
          </Link>
          <h1 className="mb-6 text-5xl font-extrabold tracking-tight">
            Create Connector
          </h1>

          <CreateConnectorForm
            collections={collections}
            notionSearchResponse={searchResponse}
            notionToken={token}
          />
        </div>
      </main>

      <Footer />
    </>
  );
}
