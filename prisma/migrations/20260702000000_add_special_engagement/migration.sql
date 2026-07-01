-- CreateTable
CREATE TABLE "SpecialEngagement" (
    "id" TEXT NOT NULL,
    "cluster" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "engagement" TEXT NOT NULL,
    "proposalDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "seniorAssigned" TEXT NOT NULL DEFAULT '',
    "juniorAssigned" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'Ongoing',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpecialEngagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngagementTask" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "task" TEXT NOT NULL DEFAULT '',
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "comments" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EngagementTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpecialEngagement_cluster_idx" ON "SpecialEngagement"("cluster");

-- AddForeignKey
ALTER TABLE "EngagementTask" ADD CONSTRAINT "EngagementTask_engagementId_fkey"
    FOREIGN KEY ("engagementId") REFERENCES "SpecialEngagement"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
