-- DropIndex
DROP INDEX "Employee_name_key";

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "cluster" TEXT NOT NULL DEFAULT 'ads';

-- CreateIndex
CREATE INDEX "Employee_cluster_idx" ON "Employee"("cluster");

-- CreateIndex
CREATE UNIQUE INDEX "cluster_name" ON "Employee"("cluster", "name");
