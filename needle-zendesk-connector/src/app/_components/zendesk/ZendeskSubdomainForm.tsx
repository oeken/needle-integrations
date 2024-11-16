import { type User } from "@needle-ai/needle-sdk";
import { Header } from "../atoms/Header";
import { Footer } from "../atoms/Footer";

interface ZendeskSubdomainFormProps {
  user: User;
}

export function ZendeskSubdomainForm({ user }: ZendeskSubdomainFormProps) {
  return (
    <>
      <Header user={user} />

      <main className="flex grow flex-col">
        <div className="mx-auto flex w-full flex-col md:w-[700px]">
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
            <button
              type="submit"
              className="mt-2 w-full rounded bg-orange-600 px-3 py-1 text-sm font-semibold hover:bg-orange-500"
            >
              Connect Zendesk
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </>
  );
}
