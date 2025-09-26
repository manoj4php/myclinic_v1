-- Manual migration to update role enum safely
-- First, update existing 'user' and 'admin' roles to valid values

-- Update 'user' role to 'technician' and 'admin' role to 'doctor'
UPDATE "users" SET "role" = 'technician' WHERE "role" = 'user';
UPDATE "users" SET "role" = 'doctor' WHERE "role" = 'admin';

-- Now apply the enum changes
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text;
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'technician'::text;
DROP TYPE "public"."role";
CREATE TYPE "public"."role" AS ENUM('super_admin', 'doctor', 'technician');
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'technician'::"public"."role";
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."role" USING "role"::"public"."role";