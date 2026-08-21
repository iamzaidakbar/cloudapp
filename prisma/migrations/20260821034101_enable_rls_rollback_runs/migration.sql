ALTER TABLE "rollback_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rollback_runs" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_rollback_runs ON "rollback_runs"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
