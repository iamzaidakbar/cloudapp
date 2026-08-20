ALTER TABLE "terraform_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "terraform_runs" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_terraform_runs ON "terraform_runs"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
