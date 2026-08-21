import { withTenantContext } from "@/lib/db/with-tenant";

// Self-healing for dead workers / crashed pods. Fails both stale RUNNING and
// abandoned QUEUED runs (never claimed by a worker).
export async function reconcileStaleAuditRuns(tenantId: string, staleAfterMs = 20 * 60 * 1000) {
  const staleBefore = new Date(Date.now() - staleAfterMs);
  const queuedBefore = new Date(Date.now() - 5 * 60 * 1000);

  await withTenantContext(tenantId, async (tx) => {
    await tx.auditRun.updateMany({
      where: { tenantId, status: "RUNNING", startedAt: { lt: staleBefore } },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage:
          "Audit interrupted (server restarted or exceeded the maximum expected duration).",
      },
    });
    await tx.auditRun.updateMany({
      where: {
        tenantId,
        status: "QUEUED",
        startedAt: null,
        queuedAt: { lt: queuedBefore },
      },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: "Audit was never claimed by a worker (queued too long).",
      },
    });
  });
}
