CREATE TABLE IF NOT EXISTS "files" (
	"id" serial PRIMARY KEY NOT NULL,
	"ndl_connector_id" varchar(256) NOT NULL,
	"ndl_file_id" varchar(256),
	"origin_id" bigint NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "zendesk_connectors" (
	"connector_id" varchar(256) PRIMARY KEY NOT NULL,
	"subdomain" varchar(256) NOT NULL,
	"org_id" bigint NOT NULL,
	"include_tickets" boolean DEFAULT false NOT NULL,
	"include_articles" boolean DEFAULT false NOT NULL
);
