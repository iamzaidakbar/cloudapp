ALTER TABLE "audit_service_statuses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_service_statuses" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_audit_service_statuses ON "audit_service_statuses"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
