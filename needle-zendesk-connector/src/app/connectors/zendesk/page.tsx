import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "~/env";
import { api } from "~/trpc/server";
import { listCollections } from "@needle-ai/needle-sdk";
import { getSession } from "~/utils/session-utils";

import { ZendeskResourcesProvider } from "~/app/_components/providers/ZendeskResourcesProvider";
import { ResourceSelectionDialog } from "~/app/_components/zendesk/ResourceSelectionDialog";
import { SelectedResources } from "~/app/_components/zendesk/SelectedResources";
import { CreateConnectorForm } from "~/app/_components/CreateConnnectorForm";
import { Header } from "~/app/_components/atoms/Header";
import { Footer } from "~/app/_components/atoms/Footer";
import { ZendeskSubdomainForm } from "~/app/_components/zendesk/ZendeskSubdomainForm";
import { ZendeskConnectorHeader } from "~/app/_components/zendesk/ZendeskConnectorHeader";
import { ZendeskResourceInfo } from "~/app/_components/zendesk/ZendeskResourceInfo";
import { ZENDESK_SCOPES } from "~/utils/zendesk";

interface PageProps {
  searchParams: {
    state?: string;
    subdomain?: string;
  };
}

function handleZendeskOAuth(subdomain: string) {
  const headersList = headers();
  const host = headersList.get("host");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${host}`;

  const params = new URLSearchParams({
    response_type: "code",
    redirect_uri: `${baseUrl}/api/zendesk/callback`,
    client_id: env.NEXT_PUBLIC_ZENDESK_CLIENT_ID,
    scope: ZENDESK_SCOPES.join(" "),
  });

  return redirect(
    `https://${subdomain}.zendesk.com/oauth/authorizations/new?${params.toString()}`,
  );
}

export default async function ZendeskPage({ searchParams }: PageProps) {
  const { user, session } = await getSession();
  const { state: accessToken, subdomain } = searchParams;

  // Handle initial state
  if (!accessToken && !subdomain) {
    return <ZendeskSubdomainForm user={user} />;
  }

  // Handle OAuth flow
  if (!accessToken && subdomain) {
    return handleZendeskOAuth(subdomain);
  }

  if (!accessToken) {
    return redirect("/error?message=missing-access-token");
  }

  // Fetch required data
  const { tickets, articles } = await api.connectors.getData({
    accessToken,
  });

  const collections = await listCollections(session.id);

  return (
    <>
      <Header user={user} />
      <ZendeskConnectorHeader />
      <ZendeskResourcesProvider
        tickets={tickets.items}
        articles={articles.items}
      >
        <main className="mx-auto flex w-full flex-col px-4 xl:max-w-[50%]">
          <div className="my-8 flex flex-col">
            <span className="mb-2 text-zinc-500">
              Please select Zendesk tickets and articles to track. You can
              manage which items you want to sync with Needle.
            </span>
            <ResourceSelectionDialog />
            <SelectedResources />
            <ZendeskResourceInfo />
            <CreateConnectorForm
              collections={collections}
              credentials={accessToken}
            />
          </div>
        </main>
      </ZendeskResourcesProvider>
      <Footer />
    </>
  );
}
