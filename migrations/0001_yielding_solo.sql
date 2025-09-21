ALTER TABLE "patients" ADD COLUMN "emergency" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "report_status" varchar DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "study_time" varchar;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "accession" varchar;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "study_desc" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "modality" varchar;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "center" varchar;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "ref_by" varchar;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "is_printed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "reported_by" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password" varchar;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;