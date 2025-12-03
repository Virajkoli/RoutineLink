-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastCompleted" TIMESTAMP(3),
ADD COLUMN     "recurrence" TEXT,
ALTER COLUMN "priority" SET DEFAULT 4;
