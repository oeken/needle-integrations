import type { User } from "@needle-ai/needle-sdk";

export function Header({ user }: { user: User }) {
  return (
    <header className="flex justify-between">
      <a
        className="p-2 text-sm font-semibold text-gray-400 hover:text-white hover:underline"
        href={process.env.NEEDLE_URL}
      >
        ↗ To Needle
      </a>
      <p className="ml-auto p-2 text-sm">
        <span className="text-gray-400">Logged in as </span>
        <b>{user.email}</b>
      </p>
    </header>
  );
}
