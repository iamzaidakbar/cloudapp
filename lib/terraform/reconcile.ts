import { withTenantContext } from "@/lib/db/with-tenant";

// Same reasoning as lib/aws/audit/reconcile.ts — no queue/worker exists to
// resume an interrupted subprocess job, so a dead Node process would
// otherwise leave a run RUNNING forever. Apply gets a longer threshold than
// every other job in this app: real Cloud SQL instance creation alone
// commonly takes 5-15 minutes, well past the 20-minute default used
// elsewhere.
export async function reconcileStaleApplyRuns(tenantId: string, staleAfterMs = 30 * 60 * 1000) {
  const staleBefore = new Date(Date.now() - staleAfterMs);

  await withTenantContext(tenantId, (tx) =>
    tx.applyRun.updateMany({
      where: { tenantId, status: "RUNNING", startedAt: { lt: staleBefore } },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: "Apply interrupted (server restarted or exceeded the maximum expected duration).",
      },
    }),
  );
}

// This safety net was missing from the Terraform Generation phase — a
// hung `terraform init`/`plan` (e.g. a network stall) would have left a
// TerraformRun stuck RUNNING forever with no recovery path. Fixed here
// while touching this area, same 20-minute threshold as audits/comparisons
// (validate/plan are normally fast, unlike apply).
export async function reconcileStaleTerraformRuns(tenantId: string, staleAfterMs = 20 * 60 * 1000) {
  const staleBefore = new Date(Date.now() - staleAfterMs);

  await withTenantContext(tenantId, (tx) =>
    tx.terraformRun.updateMany({
      where: { tenantId, status: "RUNNING", startedAt: { lt: staleBefore } },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: "Terraform run interrupted (server restarted or exceeded the maximum expected duration).",
      },
    }),
  );
}

// Same reasoning and threshold as reconcileStaleApplyRuns — destroy can
// involve a real Cloud SQL teardown, comparably slow to creating one.
export async function reconcileStaleRollbackRuns(tenantId: string, staleAfterMs = 30 * 60 * 1000) {
  const staleBefore = new Date(Date.now() - staleAfterMs);

  await withTenantContext(tenantId, (tx) =>
    tx.rollbackRun.updateMany({
      where: { tenantId, status: "RUNNING", startedAt: { lt: staleBefore } },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: "Rollback interrupted (server restarted or exceeded the maximum expected duration).",
      },
    }),
  );
}
