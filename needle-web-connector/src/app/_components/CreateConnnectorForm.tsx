"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { type Collection } from "@needle-ai/needle-sdk";
import { useRouter } from "next/navigation";

export function CreateConnectorForm({
  collections,
}: {
  collections: Collection[];
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [collectionId, setCollectionId] = useState(collections[0]!.id);

  const { mutate: createWebConnector } = api.connectors.create.useMutation({
    onSuccess: () => {
      router.push("/connectors");
      router.refresh();
    },
  });

  return (
    <form className="flex flex-col gap-2">
      <div>
        <label>File 1</label>
        <input
          className="w-full rounded-md border border-gray-700 bg-transparent p-2 -outline-offset-1 outline-orange-500 focus:outline-double"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          type="text"
          placeholder="https://example.com"
        />
      </div>

      <div className="mt-2 flex flex-col">
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

      <button
        type="button"
        onClick={() => createWebConnector({ urls: [url], collectionId })}
        className="ml-auto mt-2 rounded bg-orange-600 px-3 py-1 text-sm font-semibold hover:bg-orange-500"
      >
        Create Connector
      </button>
    </form>
  );
}
