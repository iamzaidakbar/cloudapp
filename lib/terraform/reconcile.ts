import { withTenantContext } from "@/lib/db/with-tenant";

export async function reconcileStaleApplyRuns(tenantId: string, staleAfterMs = 30 * 60 * 1000) {
  const staleBefore = new Date(Date.now() - staleAfterMs);
  const queuedBefore = new Date(Date.now() - 5 * 60 * 1000);

  await withTenantContext(tenantId, async (tx) => {
    await tx.applyRun.updateMany({
      where: { tenantId, status: "RUNNING", startedAt: { lt: staleBefore } },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage:
          "Apply interrupted (server restarted or exceeded the maximum expected duration).",
      },
    });
    await tx.applyRun.updateMany({
      where: {
        tenantId,
        status: "QUEUED",
        startedAt: null,
        queuedAt: { lt: queuedBefore },
      },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: "Apply was never claimed by a worker or Job (queued too long).",
      },
    });
  });
}

export async function reconcileStaleTerraformRuns(tenantId: string, staleAfterMs = 20 * 60 * 1000) {
  const staleBefore = new Date(Date.now() - staleAfterMs);
  const queuedBefore = new Date(Date.now() - 5 * 60 * 1000);

  await withTenantContext(tenantId, async (tx) => {
    await tx.terraformRun.updateMany({
      where: { tenantId, status: "RUNNING", startedAt: { lt: staleBefore } },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage:
          "Terraform run interrupted (server restarted or exceeded the maximum expected duration).",
      },
    });
    await tx.terraformRun.updateMany({
      where: {
        tenantId,
        status: "QUEUED",
        startedAt: null,
        queuedAt: { lt: queuedBefore },
      },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: "Terraform run was never claimed by a worker or Job (queued too long).",
      },
    });
  });
}

export async function reconcileStaleRollbackRuns(tenantId: string, staleAfterMs = 30 * 60 * 1000) {
  const staleBefore = new Date(Date.now() - staleAfterMs);
  const queuedBefore = new Date(Date.now() - 5 * 60 * 1000);

  await withTenantContext(tenantId, async (tx) => {
    await tx.rollbackRun.updateMany({
      where: { tenantId, status: "RUNNING", startedAt: { lt: staleBefore } },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage:
          "Rollback interrupted (server restarted or exceeded the maximum expected duration).",
      },
    });
    await tx.rollbackRun.updateMany({
      where: {
        tenantId,
        status: "QUEUED",
        startedAt: null,
        queuedAt: { lt: queuedBefore },
      },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: "Rollback was never claimed by a worker or Job (queued too long).",
      },
    });
  });
}
