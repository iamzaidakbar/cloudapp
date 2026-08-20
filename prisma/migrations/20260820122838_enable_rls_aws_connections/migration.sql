-- Enable row-level security on aws_connections and FORCE it so that the
-- application's own database role (which owns this table) is also subject
-- to the policy. Without FORCE, Postgres exempts table owners from RLS by
-- default, which would make this policy a silent no-op for our app's own
-- connection.
ALTER TABLE "aws_connections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "aws_connections" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_aws_connections ON "aws_connections"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
