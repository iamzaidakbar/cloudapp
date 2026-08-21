-- One-time backfill: the only place a "pick the oldest tenant" query is
-- ever legitimate — a migration of pre-existing rows, never a runtime
-- request-handling path. The existing seeded admin becomes TENANT_ADMIN of
-- the one existing tenant it was already, in effect, administering.
UPDATE "admins" SET "tenantId" = (SELECT id FROM "tenants" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "tenantId" IS NULL;

-- Enforces the role/tenant pairing at the database level: a PLATFORM_OPERATOR
-- has no tenant; TENANT_ADMIN/TENANT_MEMBER always belong to exactly one.
ALTER TABLE "admins" ADD CONSTRAINT "admin_role_tenant_consistency" CHECK (
  ("role" = 'PLATFORM_OPERATOR' AND "tenantId" IS NULL) OR
  ("role" IN ('TENANT_ADMIN', 'TENANT_MEMBER') AND "tenantId" IS NOT NULL)
);
