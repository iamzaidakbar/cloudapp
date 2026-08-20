import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";

// Scopes the current Postgres session to a tenant so row-level security
// policies (see prisma/migrations/*_enable_rls_*) apply. Must be called
// within an existing transaction — RLS session variables are connection-
// scoped, and Prisma only pins a single connection for the duration of an
// interactive transaction.
export async function setTenantContext(tx: Prisma.TransactionClient, tenantId: string) {
  await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
}

// Convenience wrapper for the common case of a single tenant-scoped
// operation. Do not call this from inside another prisma.$transaction
// callback (nested transactions aren't supported) — use setTenantContext
// directly against the existing `tx` in that case instead.
export async function withTenantContext<T>(
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await setTenantContext(tx, tenantId);
    return fn(tx);
  });
}
