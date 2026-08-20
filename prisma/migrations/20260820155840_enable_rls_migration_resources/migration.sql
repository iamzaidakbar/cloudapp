ALTER TABLE "migration_resources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "migration_resources" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_migration_resources ON "migration_resources"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
