"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { type Collection } from "@needle-ai/needle-sdk";
import { useRouter } from "next/navigation";
import { useZendeskResources } from "./providers/ZendeskResourcesProvider";
import { Button } from "./atoms/Button";
import { Select } from "./atoms/Select";
import { Input } from "./atoms/Input";

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

  const { tickets, articles, selectedOrganizationId, selectedSubdomain } =
    useZendeskResources();

  const { mutate: createZendeskConnector, isPending } =
    api.connectors.create.useMutation({
      onSuccess: () => {
        router.push("/connectors");
        router.refresh();
      },
    });

  return (
    <form className="flex flex-col gap-2">
      <div>
        <label>Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          type="text"
          placeholder="Enter connector name"
        />
      </div>

      <div className="mb-2 mt-2 flex flex-col">
        <label>Collection</label>
        <Select
          items={collections.map((collection) => ({
            value: collection.id,
            label: collection.name,
          }))}
          defaultValue={collectionId}
          onChange={(value) => setCollectionId(value as string)}
        />
      </div>

      <Button
        isLoading={isPending}
        type="button"
        className="ml-auto"
        onClick={() =>
          createZendeskConnector({
            name,
            collectionId,
            credentials,
            selectedTickets: tickets,
            selectedArticles: articles,
            organizationId: selectedOrganizationId!,
            subdomain: selectedSubdomain!,
          })
        }
      >
        Create Zendesk Connector
      </Button>
    </form>
  );
}
