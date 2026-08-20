ALTER TABLE "migration_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "migration_plans" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_migration_plans ON "migration_plans"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
