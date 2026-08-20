ALTER TABLE "comparison_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "comparison_runs" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_comparison_runs ON "comparison_runs"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
