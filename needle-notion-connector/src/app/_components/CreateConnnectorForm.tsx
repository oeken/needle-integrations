"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { type Collection } from "@needle-ai/needle-sdk";
import { useRouter } from "next/navigation";
import { SearchResponse } from "@notionhq/client/build/src/api-endpoints";
import { NotionPreview } from "./NotionPreview";
import { type NotionToken } from "~/models/notion-models";
import { Controller, useForm } from "react-hook-form";
import { Button } from "./atoms/Button";
import { Input } from "./atoms/Input";
import { Select } from "./atoms/Select";
import { HourItems, MinuteItems, TimezoneItems } from "~/utils/date-items";

interface FormValues {
  name: string;
  collectionId: string;
  hour: number;
  minute: number;
  timezone: string;
}

export function CreateConnectorForm({
  collections,
  searchResponse,
  token,
}: {
  collections: Collection[];
  searchResponse: SearchResponse;
  token: NotionToken;
}) {
  const router = useRouter();

  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      collectionId: "",
      hour: 0,
      minute: 0,
      timezone: "UTC",
    },
  });

  const { mutate: createNotionConnector, isPending } =
    api.connectors.create.useMutation({
      onSuccess: () => {
        router.push("/connectors");
        router.refresh();
      },
    });

  const onSubmit = (data: FormValues) => {
    // Convert hour and minute to cron format
    const cronJob = `${data.minute} ${data.hour} * * *`;

    createNotionConnector({
      ...data,
      cronJob,
      cronJobTimezone: data.timezone,
      notionToken: token,
      notionPages: searchResponse.results.map((p) => ({
        id: p.id,
        last_edited_time: p.last_edited_time,
        url: p.url,
      })),
    });
  };

  const isFormValid =
    form.watch("name") &&
    form.watch("collectionId") &&
    form.watch("hour") !== undefined &&
    form.watch("minute") !== undefined &&
    form.watch("timezone") !== undefined;

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex max-w-2xl flex-col gap-6"
    >
      <div className="mt-2 flex flex-col gap-2">
        <div className="text-lg font-semibold">
          Selected {searchResponse.results.length} pages:
        </div>
        <NotionPreview searchResponse={searchResponse} />
      </div>

      <div className="flex flex-col">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Name
        </label>
        <p className="text-gray-600">
          Enter a display name for this connector.
        </p>
        <Controller
          name="name"
          control={form.control}
          rules={{ required: true }}
          render={({ field }) => (
            <Input {...field} type="text" placeholder="Connector name" />
          )}
        />
      </div>

      <div className="flex flex-col">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Collections
        </label>
        <p className="text-gray-600">
          Select the collections you want to sync data to.
        </p>
        <Controller
          name="collectionId"
          control={form.control}
          rules={{ required: true }}
          render={({ field }) => (
            <Select
              items={collections.map((collection) => ({
                value: collection.id,
                label: collection.name,
              }))}
              defaultValue={field.value}
              onChange={field.onChange}
              placeholder="Select collections"
            />
          )}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Schedule
        </label>
        <p className="text-sm text-zinc-500">
          We will run your connector every day, please pick a time and time
          zone.
        </p>
        <div className="flex items-center gap-2">
          <Controller
            name="hour"
            control={form.control}
            rules={{ required: true }}
            render={({ field }) => (
              <Select
                items={HourItems}
                onChange={field.onChange}
                placeholder="Hour"
                className="w-[120px]"
              />
            )}
          />
          <span className="text-xl">:</span>
          <Controller
            name="minute"
            control={form.control}
            rules={{ required: true }}
            render={({ field }) => (
              <Select
                items={MinuteItems}
                onChange={field.onChange}
                placeholder="Minute"
                className="w-[120px]"
              />
            )}
          />
          <span className="mx-2">in</span>
          <Controller
            name="timezone"
            control={form.control}
            rules={{ required: true }}
            render={({ field }) => (
              <Select
                items={TimezoneItems}
                onChange={field.onChange}
                placeholder="Select timezone"
                className="w-[240px]"
              />
            )}
          />
        </div>
      </div>

      <Button
        isLoading={isPending}
        disabled={!isFormValid}
        className="ml-auto"
        type="submit"
      >
        Create Connector
      </Button>
    </form>
  );
}
