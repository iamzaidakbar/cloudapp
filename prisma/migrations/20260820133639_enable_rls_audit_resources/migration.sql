ALTER TABLE "audit_resources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_resources" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_audit_resources ON "audit_resources"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
