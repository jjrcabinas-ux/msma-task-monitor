-- AlterTable
ALTER TABLE "Task" ADD COLUMN "blockerForTaskId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Task_blockerForTaskId_key" ON "Task"("blockerForTaskId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_blockerForTaskId_fkey" FOREIGN KEY ("blockerForTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
