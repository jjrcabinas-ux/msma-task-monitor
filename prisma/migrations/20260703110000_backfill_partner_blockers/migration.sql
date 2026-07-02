-- One-time backfill: existing open ADS-cluster blockers that mention the
-- partner (Atty / Ton / ADS) become Pending deliverables on the ADS account,
-- linked via blockerForTaskId so completing them resolves the member's task.
INSERT INTO "Task" ("id", "employeeId", "date", "dueDate", "taskGeneral", "taskDetails", "status", "helpNeeded", "blockerForTaskId")
SELECT
  gen_random_uuid()::text,
  p."id",
  to_char(now(), 'YYYY-MM-DD'),
  t."dueDate",
  '[Blocker] ' || COALESCE(NULLIF(btrim(e."nickname"), ''), e."name") || ' — ' || COALESCE(NULLIF(t."taskGeneral", ''), '(untitled)'),
  t."helpNeeded",
  'Pending',
  '',
  t."id"
FROM "Task" t
JOIN "Employee" e ON e."id" = t."employeeId"
JOIN "Employee" p ON p."cluster" = 'ads'
  AND (LOWER(btrim(p."nickname")) = 'ads' OR LOWER(btrim(p."name")) = 'ads')
WHERE e."cluster" = 'ads'
  AND t."status" <> 'Done'
  AND btrim(t."helpNeeded") <> ''
  AND (t."helpNeeded" || ' ' || t."taskGeneral") ~* '\y(atty|ton|ads)\y'
  AND t."blockerForTaskId" IS NULL
  AND t."employeeId" <> p."id"
  AND NOT EXISTS (SELECT 1 FROM "Task" b WHERE b."blockerForTaskId" = t."id");
