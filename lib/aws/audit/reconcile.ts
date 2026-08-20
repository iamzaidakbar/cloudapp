import { withTenantContext } from "@/lib/db/with-tenant";

// No queue/worker exists to resume an interrupted audit job, so if the Node
// process dies mid-run (crash, dev-server restart), the AuditRun would
// otherwise stay RUNNING forever. Called at the top of every /api/audits*
// route — cheap, self-healing, no cron needed. 20 minutes is comfortably
// longer than the 15-minute STS session used for the job.
export async function reconcileStaleAuditRuns(tenantId: string, staleAfterMs = 20 * 60 * 1000) {
  const staleBefore = new Date(Date.now() - staleAfterMs);

  await withTenantContext(tenantId, (tx) =>
    tx.auditRun.updateMany({
      where: { tenantId, status: "RUNNING", startedAt: { lt: staleBefore } },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: "Audit interrupted (server restarted or exceeded the maximum expected duration).",
      },
    }),
  );
}
