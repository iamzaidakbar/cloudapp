import { after } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { getTenantWithConnection } from "@/lib/tenant";
import { getMigrationPlan } from "@/lib/migrations";
import { getActiveRollbackRun, getLatestRollbackRun, createRollbackRun } from "@/lib/rollback-runs";
import { runRollback } from "@/lib/terraform/run-rollback";
import { reconcileStaleRollbackRuns } from "@/lib/terraform/reconcile";
import { env } from "@/lib/env";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return apiError("Unauthorized", 401);
  }

  try {
    const { id } = await params;
    const { tenant } = await getTenantWithConnection();
    if (!tenant) {
      return apiError("Organization not configured", 404);
    }

    if (!env.GCP_PROJECT_ID) {
      return apiError("Set GCP_PROJECT_ID before rolling back", 400);
    }

    const plan = await getMigrationPlan(tenant.id, id);
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

    await reconcileStaleRollbackRuns(tenant.id);

    const active = await getActiveRollbackRun(tenant.id, id);
    if (active) {
      return apiError("A rollback is already in progress for this plan", 409);
    }

    const rollbackRun = await createRollbackRun(tenant.id, id);

    after(() =>
      runRollback(rollbackRun.id, tenant.id).catch((error) => console.error("Rollback run failed unexpectedly:", error)),
    );

    return apiSuccess({ rollbackRun }, 202);
  } catch (error) {
    console.error("Starting rollback failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return apiError("Unauthorized", 401);
  }

  try {
    const { id } = await params;
    const { tenant } = await getTenantWithConnection();
    if (!tenant) {
      return apiError("Organization not configured", 404);
    }

    await reconcileStaleRollbackRuns(tenant.id);

    const rollbackRun = await getLatestRollbackRun(tenant.id, id);
    return apiSuccess({ rollbackRun });
  } catch (error) {
    console.error("Fetching rollback run failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
