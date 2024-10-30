CREATE TABLE IF NOT EXISTS "files" (
	"id" serial PRIMARY KEY NOT NULL,
	"ndl_connector_id" varchar(256) NOT NULL,
	"ndl_file_id" varchar(256),
	"url" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
