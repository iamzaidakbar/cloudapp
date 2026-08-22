import { withTenantContext } from "@/lib/db/with-tenant";

export async function getNextTransferRunVersion(tenantId: string, migrationPlanId: string): Promise<number> {
  const latest = await withTenantContext(tenantId, (tx) =>
    tx.transferRun.findFirst({
      where: { tenantId, migrationPlanId },
      orderBy: { version: "desc" },
      select: { version: true },
    }),
  );
  return (latest?.version ?? 0) + 1;
}

export async function getActiveTransferRun(tenantId: string, migrationPlanId: string) {
  return withTenantContext(tenantId, (tx) =>
    tx.transferRun.findFirst({
      where: { tenantId, migrationPlanId, status: { in: ["QUEUED", "RUNNING"] } },
      orderBy: { version: "desc" },
    }),
  );
}

export async function getLatestTransferRun(tenantId: string, migrationPlanId: string) {
  return withTenantContext(tenantId, (tx) =>
    tx.transferRun.findFirst({ where: { tenantId, migrationPlanId }, orderBy: { version: "desc" } }),
  );
}

export async function createTransferRun(tenantId: string, migrationPlanId: string) {
  const version = await getNextTransferRunVersion(tenantId, migrationPlanId);
  return withTenantContext(tenantId, (tx) =>
    tx.transferRun.create({ data: { tenantId, migrationPlanId, version } }),
  );
}

export async function reconcileStaleTransferRuns(tenantId: string, staleAfterMs = 60 * 60 * 1000) {
  const staleBefore = new Date(Date.now() - staleAfterMs);
  const queuedBefore = new Date(Date.now() - 15 * 60 * 1000);

  await withTenantContext(tenantId, async (tx) => {
    await tx.transferRun.updateMany({
      where: { tenantId, status: "RUNNING", startedAt: { lt: staleBefore } },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage:
          "Data transfer interrupted (server restarted or exceeded the maximum expected duration).",
      },
    });
    await tx.transferRun.updateMany({
      where: {
        tenantId,
        status: "QUEUED",
        startedAt: null,
        queuedAt: { lt: queuedBefore },
      },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: "Data transfer Job never started (still queued).",
      },
    });
  });
}
