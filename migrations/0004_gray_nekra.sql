ALTER TABLE "patients" ALTER COLUMN "age" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "date_of_birth" timestamp NOT NULL;