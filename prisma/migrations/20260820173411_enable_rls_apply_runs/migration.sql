ALTER TABLE "apply_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "apply_runs" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_apply_runs ON "apply_runs"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
