-- AlterTable: Add firstName, lastName, middleName columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "firstName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "middleName" TEXT;

-- AlterTable: Add type and order columns to assessment_questions table
ALTER TABLE "assessment_questions" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'preTest';
ALTER TABLE "assessment_questions" ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;
