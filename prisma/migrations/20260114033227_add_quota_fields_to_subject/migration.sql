-- AlterTable
ALTER TABLE "subject_reference" ADD COLUMN     "available_quota" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "max_quota" INTEGER NOT NULL DEFAULT 30;
