CREATE TABLE IF NOT EXISTS "files" (
	"id" serial PRIMARY KEY NOT NULL,
	"ndl_connector_id" varchar(256) NOT NULL,
	"ndl_file_id" varchar(256),
	"url" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" varchar(50),
	"priority" varchar(50),
	"html_url" text,
	"body" text,
	"subject" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
