"use client";

import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export function DeleteConnectorButton({
  connectorId,
}: {
  connectorId: string;
}) {
  const router = useRouter();
  const { mutate: deleteSlackConnector } = api.connectors.delete.useMutation({
    onSuccess: () => {
      router.push("/connectors");
      router.refresh();
    },
  });

  return (
    <button
      onClick={() => deleteSlackConnector({ connectorId })}
      className="ml-auto rounded-md border border-red-600 px-3 py-1 text-sm text-red-600 hover:bg-red-600 hover:text-white"
    >
      Delete
    </button>
  );
}
