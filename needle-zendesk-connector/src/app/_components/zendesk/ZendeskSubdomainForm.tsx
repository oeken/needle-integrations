import { type User } from "@needle-ai/needle-sdk";
import { Header } from "../atoms/Header";
import { Footer } from "../atoms/Footer";
import Link from "next/link";
import { Button } from "../atoms/Button";

interface ZendeskSubdomainFormProps {
  user: User;
}

export function ZendeskSubdomainForm({ user }: ZendeskSubdomainFormProps) {
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
            Connect Your Zendesk
          </h1>

          <form action="" method="GET" className="mt-8 flex flex-col gap-4">
            <div>
              <label
                htmlFor="subdomain"
                className="block text-sm font-semibold text-gray-400"
              >
                Your Zendesk Subdomain
              </label>
              <div className="mt-2 flex rounded-md">
                <input
                  type="text"
                  name="subdomain"
                  id="subdomain"
                  className="block w-full rounded-md border border-gray-700 bg-transparent px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="your-company"
                  required
                />
                <span className="inline-flex items-center px-3 text-gray-400">
                  .zendesk.com
                </span>
              </div>
            </div>
            <Button className="mr-auto" type="submit">
              Connect Zendesk
            </Button>
          </form>
        </div>
      </main>

      <Footer />
    </>
  );
}
