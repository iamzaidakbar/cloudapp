import { withTenantContext } from "@/lib/db/with-tenant";

export async function getNextApplyRunVersion(tenantId: string, migrationPlanId: string): Promise<number> {
  const latest = await withTenantContext(tenantId, (tx) =>
    tx.applyRun.findFirst({ where: { tenantId, migrationPlanId }, orderBy: { version: "desc" }, select: { version: true } }),
  );
  return (latest?.version ?? 0) + 1;
}

export async function getActiveApplyRun(tenantId: string, migrationPlanId: string) {
  return withTenantContext(tenantId, (tx) =>
    tx.applyRun.findFirst({
      where: { tenantId, migrationPlanId, status: { in: ["QUEUED", "RUNNING"] } },
      orderBy: { version: "desc" },
    }),
  );
}

export async function getLatestApplyRun(tenantId: string, migrationPlanId: string) {
  return withTenantContext(tenantId, (tx) =>
    tx.applyRun.findFirst({ where: { tenantId, migrationPlanId }, orderBy: { version: "desc" } }),
  );
}

export async function createApplyRun(tenantId: string, migrationPlanId: string) {
  const version = await getNextApplyRunVersion(tenantId, migrationPlanId);
  return withTenantContext(tenantId, (tx) => tx.applyRun.create({ data: { tenantId, migrationPlanId, version } }));
}
