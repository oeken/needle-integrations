DO $$ BEGIN
 CREATE TYPE "public"."notion_object" AS ENUM('database', 'page');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notion_connectors" (
	"id" serial PRIMARY KEY NOT NULL,
	"ndl_connector_id" varchar(256) NOT NULL,
	"notion_workspace_id" uuid NOT NULL,
	"notion_workspace_name" varchar(256) NOT NULL,
	"notion_user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notion_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"ndl_connector_id" varchar(256) NOT NULL,
	"ndl_file_id" varchar(256) NOT NULL,
	"notion_page_id" varchar(256) NOT NULL,
	"notion_page_title" varchar(256) NOT NULL,
	"notion_object" "notion_object" NOT NULL,
	"notion_last_edited_time" varchar NOT NULL,
	"notion_url" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
