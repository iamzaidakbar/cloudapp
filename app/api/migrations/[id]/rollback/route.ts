import { after } from "next/server";
import { requireTenantAdmin, requireTenantScope } from "@/lib/auth/guard";
import { getMigrationPlan } from "@/lib/migrations";
import { getActiveRollbackRun, getLatestRollbackRun, createRollbackRun } from "@/lib/rollback-runs";
import { reconcileStaleRollbackRuns } from "@/lib/terraform/reconcile";
import { env } from "@/lib/env";
import { apiError, apiErrorFromAuth, apiSuccess } from "@/lib/api/response";
import { logAdminAction } from "@/lib/admin-action-log";
import { enqueueJob } from "@/lib/jobs/enqueue";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try {
    admin = await requireTenantAdmin();
  } catch (error) {
    return apiErrorFromAuth(error);
  }

  try {
    const { id } = await params;

    if (!env.GCP_PROJECT_ID) {
      return apiError("Set GCP_PROJECT_ID before rolling back", 400);
    }

    const plan = await getMigrationPlan(admin.tenantId, id);
    if (!plan) {
      return apiError("Migration plan not found", 404);
    }
    if (plan.status === "CANCELLED" || plan.status === "ROLLED_BACK") {
      return apiError("This migration plan has no active infrastructure to roll back", 400);
    }

    const hasProvisionedResource = plan.resources.some((r) => r.gcpResourceSelfLink);
    if (!hasProvisionedResource) {
      return apiError("No resources have been provisioned for this plan — nothing to roll back", 400);
    }

    const body = await request.json().catch(() => null);
    const confirmSequenceNumber = body?.confirmSequenceNumber;
    if (confirmSequenceNumber !== plan.sequenceNumber) {
      return apiError("Confirmation number did not match this plan — nothing was destroyed", 400);
    }

    await reconcileStaleRollbackRuns(admin.tenantId);

    const active = await getActiveRollbackRun(admin.tenantId, id);
    if (active) {
      return apiError("A rollback is already in progress for this plan", 409);
    }

    const rollbackRun = await createRollbackRun(admin.tenantId, id);

    await enqueueJob(
      {
        type: "ROLLBACK",
        tenantId: admin.tenantId,
        runId: rollbackRun.id,
        migrationPlanId: id,
      },
      { after },
    );

    await logAdminAction({
      tenantId: admin.tenantId,
      adminId: admin.id,
      adminEmail: admin.email,
      action: "MIGRATION_ROLLED_BACK",
      targetType: "MigrationPlan",
      targetId: id,
      detail: { confirmSequenceNumber },
    });

    return apiSuccess({ rollbackRun }, 202);
  } catch (error) {
    console.error("Starting rollback failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try {
    admin = await requireTenantScope();
  } catch (error) {
    return apiErrorFromAuth(error);
  }

  try {
    const { id } = await params;
    await reconcileStaleRollbackRuns(admin.tenantId);

    const rollbackRun = await getLatestRollbackRun(admin.tenantId, id);
    return apiSuccess({ rollbackRun });
  } catch (error) {
    console.error("Fetching rollback run failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
