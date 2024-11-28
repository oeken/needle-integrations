"use client"; // Add this to mark as client component

import { type User } from "@needle-ai/needle-sdk";
import { useRouter } from "next/navigation"; // Add this import
import { Header } from "../atoms/Header";
import { Footer } from "../atoms/Footer";
import { Button } from "../atoms/Button";

interface SlackWorkspaceFormProps {
  user: User;
}

export function SlackWorkspaceForm({ user }: SlackWorkspaceFormProps) {
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/connectors/slack?workspace=slack");
  };

  return (
    <>
      <Header user={user} />
      <main className="flex grow flex-col">
        <div className="mx-auto flex w-full flex-col md:w-[700px]">
          <h1 className="my-8 text-5xl font-extrabold tracking-tight">
            Connect Slack Workspace
          </h1>
          <p className="mb-8 text-gray-400">
            Connect your Slack workspace to Needle AI to enable intelligent
            search across your teams communications.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Button type="submit">Connect with Slack</Button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
