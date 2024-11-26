"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { type Collection } from "@needle-ai/needle-sdk";
import { useRouter } from "next/navigation";
import { type PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { NotionPageTable } from "./NotionPageTable";

export function CreateConnectorForm({
  collections,
  pages,
}: {
  collections: Collection[];
  pages: PageObjectResponse[];
}) {
  const router = useRouter();
  const [collectionId, setCollectionId] = useState(collections[0]!.id);

  const { mutate: createWebConnector } = api.connectors.create.useMutation({
    onSuccess: () => {
      router.push("/connectors");
      router.refresh();
    },
  });

  return (
    <form className="flex flex-col gap-2">
      <div className="mt-2 flex flex-col">
        <NotionPageTable pages={pages} />
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
        onClick={() => console.log(pages)}
        className="ml-auto mt-2 rounded bg-orange-600 px-3 py-1 text-sm font-semibold hover:bg-orange-500"
      >
        Create Connector
      </button>
    </form>
  );
}
