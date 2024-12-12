CREATE TABLE IF NOT EXISTS "slack_canvases" (
	"id" serial PRIMARY KEY NOT NULL,
	"ndl_connector_id" varchar(256) NOT NULL,
	"ndl_file_id" varchar(256) NOT NULL,
	"channel_id" varchar(256) NOT NULL,
	"origin_id" varchar(256) NOT NULL,
	"url" varchar(2048) NOT NULL,
	"title" varchar(512) NOT NULL,
	"data_type" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "slack_connectors" (
	"connector_id" varchar(256) PRIMARY KEY NOT NULL,
	"channel_info" jsonb,
	"timezone" text,
	"last_synced_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "slack_channel_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"ndl_connector_id" varchar(256) NOT NULL,
	"ndl_file_id" varchar(256) NOT NULL,
	"channel_id" varchar(256) NOT NULL,
	"month_start" varchar(32) NOT NULL,
	"month_end" varchar(32) NOT NULL,
	"data_type" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "slack_canvases" ADD CONSTRAINT "slack_canvases_ndl_connector_id_slack_connectors_connector_id_fk" FOREIGN KEY ("ndl_connector_id") REFERENCES "public"."slack_connectors"("connector_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "slack_channel_messages" ADD CONSTRAINT "slack_channel_messages_ndl_connector_id_slack_connectors_connector_id_fk" FOREIGN KEY ("ndl_connector_id") REFERENCES "public"."slack_connectors"("connector_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
