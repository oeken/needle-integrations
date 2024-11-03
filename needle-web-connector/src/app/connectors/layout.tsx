import "~/styles/globals.css";

import { type Metadata } from "next";

import { TRPCReactProvider } from "~/trpc/react";
import { HydrateClient } from "~/trpc/server";
import { getSession } from "~/utils/session-utils";
import { SessionProvider } from "~/app/_components/providers/SessionProvider";

export const metadata: Metadata = {
  title: "Needle Web Connector",
  icons: [{ rel: "icon", url: "/images/favicon.png" }],
};

export default async function ConnectorsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user } = await getSession();

  return (
    <TRPCReactProvider>
      <SessionProvider email={user.email}>
        <HydrateClient>{children}</HydrateClient>
      </SessionProvider>
    </TRPCReactProvider>
  );
}
