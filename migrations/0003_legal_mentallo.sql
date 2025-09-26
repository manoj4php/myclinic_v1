CREATE TABLE "seo_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"path" varchar(255) NOT NULL,
	"title" varchar(255),
	"description" text,
	"canonical_url" varchar(512),
	"og_title" varchar(255),
	"og_description" text,
	"og_image" varchar(512),
	"og_url" varchar(512),
	"twitter_card" varchar(50),
	"twitter_creator" varchar(255),
	"twitter_site" varchar(255),
	"twitter_image" varchar(512),
	"no_index" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "seo_configs_path_unique" UNIQUE("path")
);
--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "age" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" DROP COLUMN "date_of_birth";