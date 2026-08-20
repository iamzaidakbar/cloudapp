ALTER TABLE "audit_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_runs" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_audit_runs ON "audit_runs"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
