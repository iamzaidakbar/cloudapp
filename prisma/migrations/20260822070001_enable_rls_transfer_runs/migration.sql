ALTER TABLE "transfer_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transfer_runs" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_transfer_runs ON "transfer_runs"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
