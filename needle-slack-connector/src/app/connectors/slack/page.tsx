import { redirect } from "next/navigation";
import { listCollections } from "@needle-ai/needle-sdk";
import { getSession } from "~/utils/session-utils";
import { Header } from "~/app/_components/atoms/Header";
import { Footer } from "~/app/_components/atoms/Footer";
import { SlackWorkspaceForm } from "~/app/_components/slack/SlackWorkspaceForm";
import { SlackConnectorHeader } from "~/app/_components/slack/SlackConnectorHeader";
import { SlackWorkspacePreview } from "~/app/_components/slack/SlackWorkspacePreview";
import { SlackResourcesProvider } from "~/app/_components/providers/SlackResourcesProvider";
import { buildSlackBotOAuthUrl, buildSlackUserOAuthUrl } from "~/utils/slack";

interface PageProps {
  searchParams: {
    state?: string;
    workspace?: string;
    slackUserId?: string;
  };
}

const handleSlackOAuth = (workspace: string, type: "bot" | "user") => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const redirectUrl =
    type === "bot"
      ? buildSlackBotOAuthUrl(baseUrl)
      : buildSlackUserOAuthUrl(baseUrl);

  return redirect(redirectUrl);
};

export default async function SlackPage({ searchParams }: PageProps) {
  const { user, session } = await getSession();
  const { state: accessToken, workspace, slackUserId } = searchParams;

  if (!accessToken && !workspace) {
    return <SlackWorkspaceForm user={user} />;
  }

  if (!accessToken && workspace) {
    return handleSlackOAuth(workspace, "user");
  }

  if (!accessToken || !slackUserId) {
    return redirect("/error?message=missing-authorization-code-or-user-id");
  }

  const collections = await listCollections(session.id);

  return (
    <>
      <Header user={user} />
      <SlackConnectorHeader />
      <SlackResourcesProvider credentials={accessToken} userId={slackUserId}>
        <main className="mx-auto flex w-full flex-col px-4 xl:max-w-[50%]">
          <div className="my-8 flex flex-col">
            <SlackWorkspacePreview
              collections={collections}
              credentials={accessToken}
            />
          </div>
        </main>
      </SlackResourcesProvider>
      <Footer />
    </>
  );
}
