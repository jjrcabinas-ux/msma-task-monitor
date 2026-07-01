CREATE TABLE "AuditIndex" (
  "id"         TEXT NOT NULL,
  "cluster"    TEXT NOT NULL,
  "clientName" TEXT NOT NULL DEFAULT '',
  "year"       INTEGER NOT NULL DEFAULT 2025,
  "pfrsType"   TEXT NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditIndex_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditIndex_cluster_idx" ON "AuditIndex"("cluster");

CREATE TABLE "AuditSection" (
  "id"         TEXT NOT NULL,
  "indexId"    TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "title"      TEXT NOT NULL DEFAULT '',
  "sectionRef" TEXT NOT NULL DEFAULT '',
  "sortOrder"  INTEGER NOT NULL DEFAULT 0,
  "isCustom"   BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "AuditSection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditItem" (
  "id"             TEXT NOT NULL,
  "sectionId"      TEXT NOT NULL,
  "refNum"         TEXT NOT NULL,
  "description"    TEXT NOT NULL DEFAULT '',
  "initials"       TEXT NOT NULL DEFAULT '',
  "sourceDocument" TEXT NOT NULL DEFAULT '',
  "isNA"           BOOLEAN NOT NULL DEFAULT false,
  "sortOrder"      INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "AuditItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AuditSection" ADD CONSTRAINT "AuditSection_indexId_fkey"
  FOREIGN KEY ("indexId") REFERENCES "AuditIndex"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuditItem" ADD CONSTRAINT "AuditItem_sectionId_fkey"
  FOREIGN KEY ("sectionId") REFERENCES "AuditSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
