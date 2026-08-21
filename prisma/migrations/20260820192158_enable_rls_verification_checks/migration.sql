ALTER TABLE "verification_checks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verification_checks" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_verification_checks ON "verification_checks"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
