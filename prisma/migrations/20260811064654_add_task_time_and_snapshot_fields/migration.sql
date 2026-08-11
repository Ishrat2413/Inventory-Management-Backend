-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "productsSnapshot" JSONB,
ADD COLUMN     "startedAt" TIMESTAMP(3);
