-- Backfill: existing LOGIN_SUCCEEDED/LOGOUT rows predate tenant-scoped
-- admins and were written with no tenantId at all (the old login/logout
-- routes had no tenant concept). They genuinely belong to whichever admin
-- performed them, now that admin has a real tenantId — backfill from there
-- so they show up in that tenant's own audit log going forward. LOGIN_FAILED
-- rows (adminId always NULL — no authenticated admin on a failed attempt)
-- are correctly left alone.
UPDATE "admin_action_logs"
SET "tenantId" = (SELECT "tenantId" FROM "admins" WHERE "admins"."id" = "admin_action_logs"."adminId")
WHERE "tenantId" IS NULL AND "adminId" IS NOT NULL;

ALTER TABLE "admin_action_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "admin_action_logs" FORCE ROW LEVEL SECURITY;

-- Two cases, not one plain equality: a tenant-scoped session (app.tenant_id
-- set) sees/writes only its own tenant's rows — no cross-tenant leak. An
-- unscoped session (app.tenant_id unset, used only for genuinely tenant-less
-- rows: a failed login to an unknown email, or a Platform Operator's own
-- action) sees/writes only NULL-tenantId rows. Plain `tenantId =
-- current_setting(...)` alone would reject NULL-tenantId inserts outright —
-- NULL = NULL is NULL, not TRUE, in SQL's three-valued logic — which would
-- have silently broken failed-login logging entirely. Confirmed against the
-- real database before this migration was applied, not assumed.
CREATE POLICY tenant_isolation_admin_action_logs ON "admin_action_logs"
  USING (
    "tenantId" = current_setting('app.tenant_id', true)
    OR ("tenantId" IS NULL AND current_setting('app.tenant_id', true) IS NULL)
  )
  WITH CHECK (
    "tenantId" = current_setting('app.tenant_id', true)
    OR ("tenantId" IS NULL AND current_setting('app.tenant_id', true) IS NULL)
  );
