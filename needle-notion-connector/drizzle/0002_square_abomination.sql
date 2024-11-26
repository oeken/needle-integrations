CREATE TABLE IF NOT EXISTS "notion_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"ndl_connector_id" varchar(256) NOT NULL,
	"ndl_file_id" varchar(256),
	"notion_page_id" varchar(256) NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
DROP TABLE "files";