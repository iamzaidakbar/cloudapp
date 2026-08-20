import { withTenantContext } from "@/lib/db/with-tenant";

// Same reasoning and threshold as lib/aws/audit/reconcile.ts's
// reconcileStaleAuditRuns — no queue/worker exists to resume an interrupted
// comparison job, so a dead Node process would otherwise leave it RUNNING
// forever. Called at the top of every /api/comparisons* route.
export async function reconcileStaleComparisonRuns(tenantId: string, staleAfterMs = 20 * 60 * 1000) {
  const staleBefore = new Date(Date.now() - staleAfterMs);

  await withTenantContext(tenantId, (tx) =>
    tx.comparisonRun.updateMany({
      where: { tenantId, status: "RUNNING", startedAt: { lt: staleBefore } },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: "Comparison interrupted (server restarted or exceeded the maximum expected duration).",
      },
    }),
  );
}
