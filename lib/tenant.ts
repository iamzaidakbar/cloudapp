import { prisma } from "@/lib/db";
import { withTenantContext } from "@/lib/db/with-tenant";
import type { ConnectionStatus } from "@/lib/generated/prisma/client";

export async function getTenantWithConnection() {
  const tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
  if (!tenant) return { tenant: null, connection: null };

  const connection = await withTenantContext(tenant.id, (tx) =>
    tx.awsConnection.findUnique({ where: { tenantId: tenant.id } }),
  );

  return { tenant, connection };
}

export function isOnboardingComplete(connection: { status: ConnectionStatus } | null) {
  return connection?.status === "CONNECTED";
}
