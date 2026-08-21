import { prisma } from "@/lib/db";
import { withTenantContext } from "@/lib/db/with-tenant";
import type { ConnectionStatus } from "@/lib/generated/prisma/client";

// tenantId always comes from the authenticated admin's own session
// (admin.tenantId, from requireTenantScope()/requireTenantAdmin()) — never
// looked up. This used to do prisma.tenant.findFirst({ orderBy: { createdAt:
// "asc" } }), i.e. "the oldest tenant" — correct only by accident when
// exactly one tenant existed; with a second tenant it would have silently
// leaked Tenant 1's data to Tenant 2's admin. That bug class is why this
// function takes tenantId explicitly now.
export async function getTenantWithConnection(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return { tenant: null, connection: null };

  const connection = await withTenantContext(tenantId, (tx) =>
    tx.awsConnection.findUnique({ where: { tenantId } }),
  );

  return { tenant, connection };
}

export function isOnboardingComplete(connection: { status: ConnectionStatus } | null) {
  return connection?.status === "CONNECTED";
}
