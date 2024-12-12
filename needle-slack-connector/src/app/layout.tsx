import "~/styles/globals.css";

import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Needle Slack Connector",
  icons: [{ rel: "icon", url: "/images/favicon.png" }],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-gradient-to-b from-[#000000] to-[#15162c] font-sans text-white antialiased">
        {children}
      </body>
    </html>
  );
}
