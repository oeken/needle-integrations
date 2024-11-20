import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "~/env";
import { api } from "~/trpc/server";
import { listCollections } from "@needle-ai/needle-sdk";
import { getSession } from "~/utils/session-utils";
import { ZendeskResourcesProvider } from "~/app/_components/providers/ZendeskResourcesProvider";
import { Header } from "~/app/_components/atoms/Header";
import { Footer } from "~/app/_components/atoms/Footer";
import { ZendeskSubdomainForm } from "~/app/_components/zendesk/ZendeskSubdomainForm";
import { ZendeskConnectorHeader } from "~/app/_components/zendesk/ZendeskConnectorHeader";
import { ZENDESK_SCOPES } from "~/utils/zendesk";
import { ZendeskOrganizationPreview } from "~/app/_components/zendesk/ZendeskOrganizationPreview";

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

  console.log({ subdomain });

  if (!accessToken && !subdomain) {
    return <ZendeskSubdomainForm user={user} />;
  }

  if (!accessToken && subdomain) {
    return handleZendeskOAuth(subdomain);
  }

  if (!accessToken) {
    return redirect("/error?message=missing-access-token");
  }

  const { items: organizations } = await api.connectors.getOrganizations({
    accessToken,
  });

  const collections = await listCollections(session.id);

  return (
    <>
      <Header user={user} />
      <ZendeskConnectorHeader />
      <ZendeskResourcesProvider
        organizations={organizations}
        credentials={accessToken}
      >
        <main className="mx-auto flex w-full flex-col px-4 xl:max-w-[50%]">
          <div className="my-8 flex flex-col">
            <ZendeskOrganizationPreview
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
