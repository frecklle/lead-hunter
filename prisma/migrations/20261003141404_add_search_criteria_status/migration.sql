-- CreateEnum
CREATE TYPE "search_status" AS ENUM ('DRAFT', 'RUNNING', 'DONE', 'ERROR');

-- AlterTable
ALTER TABLE "searches" ADD COLUMN     "criteria" JSONB,
ADD COLUMN     "status" "search_status" NOT NULL DEFAULT 'DRAFT';
