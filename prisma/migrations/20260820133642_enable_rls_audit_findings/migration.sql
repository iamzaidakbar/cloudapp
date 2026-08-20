ALTER TABLE "audit_findings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_findings" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_audit_findings ON "audit_findings"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
