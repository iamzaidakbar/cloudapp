ALTER TABLE "verification_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verification_runs" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_verification_runs ON "verification_runs"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
