-- Add assignedTo and linkedTaskId to EngagementTask
ALTER TABLE "EngagementTask" ADD COLUMN "assignedTo" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EngagementTask" ADD COLUMN "linkedTaskId" TEXT;

-- Unique constraint for 1-to-1 relation
CREATE UNIQUE INDEX "EngagementTask_linkedTaskId_key" ON "EngagementTask"("linkedTaskId");

-- Foreign key to Task
ALTER TABLE "EngagementTask" ADD CONSTRAINT "EngagementTask_linkedTaskId_fkey"
    FOREIGN KEY ("linkedTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
