CREATE TABLE IF NOT EXISTS "files" (
	"id" serial PRIMARY KEY NOT NULL,
	"ndl_connector_id" varchar(256) NOT NULL,
	"ndl_file_id" varchar(256),
	"title" varchar(512),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "slack_connectors" (
	"connector_id" varchar(256) PRIMARY KEY NOT NULL,
	"channel_info" jsonb,
	"timezone" text,
	"last_synced_at" timestamp DEFAULT now()
);
