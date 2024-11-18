"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { type Collection } from "@needle-ai/needle-sdk";
import { useRouter } from "next/navigation";
import { useZendeskResources } from "./providers/ZendeskResourcesProvider";
import { Button } from "./atoms/Button";

export function CreateConnectorForm({
  collections,
  credentials,
}: {
  collections: Collection[];
  credentials: string;
}) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [collectionId, setCollectionId] = useState(collections[0]!.id);

  const { selectedTickets, selectedArticles } = useZendeskResources();

  const { mutate: createZendeskConnector } = api.connectors.create.useMutation({
    onSuccess: () => {
      router.push("/connectors");
      router.refresh();
    },
  });

  return (
    <form className="flex flex-col gap-2">
      <div>
        <label>Name</label>
        <input
          className="w-full rounded-md border border-gray-700 bg-transparent p-2 -outline-offset-1 outline-orange-500 focus:outline-double"
          value={name}
          onChange={(e) => setName(e.target.value)}
          type="text"
          placeholder="Enter connector name"
        />
      </div>

      <div className="mb-2 mt-2 flex flex-col">
        <label>Collection</label>
        <select
          value={collectionId}
          onChange={(e) => setCollectionId(e.target.value)}
          className="rounded-md border border-gray-700 bg-transparent p-2 outline-offset-1 outline-orange-500 focus:outline-double"
        >
          {collections.map((collection) => (
            <option key={collection.id} value={collection.id}>
              {collection.name}
            </option>
          ))}
        </select>
      </div>

      <Button
        type="button"
        className="ml-auto"
        onClick={() =>
          createZendeskConnector({
            name,
            collectionId,
            credentials,
            selectedTickets,
            selectedArticles,
          })
        }
        // className="ml-auto mt-2 rounded bg-orange-600 px-3 py-1 text-sm font-semibold hover:bg-orange-500"
      >
        Create Zendesk Connector
      </Button>
    </form>
  );
}
