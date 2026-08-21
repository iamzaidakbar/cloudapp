import { withTenantContext } from "@/lib/db/with-tenant";

export async function getNextRollbackRunVersion(tenantId: string, migrationPlanId: string): Promise<number> {
  const latest = await withTenantContext(tenantId, (tx) =>
    tx.rollbackRun.findFirst({ where: { tenantId, migrationPlanId }, orderBy: { version: "desc" }, select: { version: true } }),
  );
  return (latest?.version ?? 0) + 1;
}

export async function getActiveRollbackRun(tenantId: string, migrationPlanId: string) {
  return withTenantContext(tenantId, (tx) =>
    tx.rollbackRun.findFirst({
      where: { tenantId, migrationPlanId, status: { in: ["QUEUED", "RUNNING"] } },
      orderBy: { version: "desc" },
    }),
  );
}

export async function getLatestRollbackRun(tenantId: string, migrationPlanId: string) {
  return withTenantContext(tenantId, (tx) =>
    tx.rollbackRun.findFirst({ where: { tenantId, migrationPlanId }, orderBy: { version: "desc" } }),
  );
}

export async function createRollbackRun(tenantId: string, migrationPlanId: string) {
  const version = await getNextRollbackRunVersion(tenantId, migrationPlanId);
  return withTenantContext(tenantId, (tx) => tx.rollbackRun.create({ data: { tenantId, migrationPlanId, version } }));
}
