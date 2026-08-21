import { withTenantContext } from "@/lib/db/with-tenant";

export async function reconcileStaleComparisonRuns(tenantId: string, staleAfterMs = 20 * 60 * 1000) {
  const staleBefore = new Date(Date.now() - staleAfterMs);
  const queuedBefore = new Date(Date.now() - 5 * 60 * 1000);

  await withTenantContext(tenantId, async (tx) => {
    await tx.comparisonRun.updateMany({
      where: { tenantId, status: "RUNNING", startedAt: { lt: staleBefore } },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage:
          "Comparison interrupted (server restarted or exceeded the maximum expected duration).",
      },
    });
    await tx.comparisonRun.updateMany({
      where: {
        tenantId,
        status: "QUEUED",
        startedAt: null,
        queuedAt: { lt: queuedBefore },
      },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: "Comparison was never claimed by a worker (queued too long).",
      },
    });
  });
}
