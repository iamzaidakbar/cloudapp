ALTER TABLE "comparison_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "comparison_items" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_comparison_items ON "comparison_items"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
