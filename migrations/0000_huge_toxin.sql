CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other');--> statement-breakpoint
CREATE TYPE "public"."permission" AS ENUM('add', 'edit', 'delete', 'view');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('super_admin', 'admin', 'user');--> statement-breakpoint
CREATE TYPE "public"."specialty" AS ENUM('radiology', 'pediatric', 'gynac', 'medicines', 'surgeon');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"type" varchar NOT NULL,
	"title" varchar NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"related_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"created_by" varchar,
	"ip_address" varchar
);
--> statement-breakpoint
CREATE TABLE "patient_archive" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_patient_id" uuid NOT NULL,
	"patient_data" jsonb NOT NULL,
	"archived_at" timestamp DEFAULT now(),
	"archived_by" varchar,
	"archive_reason" varchar,
	"ip_address" varchar
);
--> statement-breakpoint
CREATE TABLE "patient_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"file_name" varchar NOT NULL,
	"file_path" varchar NOT NULL,
	"file_type" varchar NOT NULL,
	"file_size" integer,
	"uploaded_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" varchar,
	"updated_by" varchar,
	"ip_address" varchar
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"email" varchar,
	"phone" varchar NOT NULL,
	"address" text,
	"date_of_birth" timestamp NOT NULL,
	"gender" "gender" NOT NULL,
	"specialty" "specialty" NOT NULL,
	"chief_complaint" text,
	"medical_history" text,
	"doctor_id" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" varchar,
	"updated_by" varchar,
	"ip_address" varchar
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"resource" varchar NOT NULL,
	"permission" "permission" NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"created_by" varchar,
	"ip_address" varchar
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"username" varchar,
	"phone" varchar,
	"address" text,
	"role" "role" DEFAULT 'user',
	"specialty" "specialty",
	"is_active" boolean DEFAULT true,
	"email_notifications" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" varchar,
	"updated_by" varchar,
	"ip_address" varchar,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_files" ADD CONSTRAINT "patient_files_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_files" ADD CONSTRAINT "patient_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");