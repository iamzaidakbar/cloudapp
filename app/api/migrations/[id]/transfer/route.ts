import { after } from "next/server";
import { requireTenantAdmin, requireTenantScope } from "@/lib/auth/guard";
import { getMigrationPlan } from "@/lib/migrations";
import { getLatestApplyRun } from "@/lib/apply-runs";
import {
  getActiveTransferRun,
  getLatestTransferRun,
  createTransferRun,
  reconcileStaleTransferRuns,
} from "@/lib/transfer-runs";
import { apiError, apiErrorFromAuth, apiSuccess } from "@/lib/api/response";
import { logAdminAction } from "@/lib/admin-action-log";
import { enqueueJob } from "@/lib/jobs/enqueue";

function serializeTransferRun<T extends { bytesCopied: bigint | null } | null>(run: T) {
  if (!run) return null;
  return {
    ...run,
    bytesCopied: run.bytesCopied == null ? null : run.bytesCopied.toString(),
  };
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try {
    admin = await requireTenantAdmin();
  } catch (error) {
    return apiErrorFromAuth(error);
  }

  try {
    const { id } = await params;

    const plan = await getMigrationPlan(admin.tenantId, id);
    if (!plan) {
      return apiError("Migration plan not found", 404);
    }
    if (plan.status !== "APPROVED") {
      return apiError("Only an approved migration plan can run data transfer", 400);
    }

    const applyRun = await getLatestApplyRun(admin.tenantId, id);
    if (!applyRun || applyRun.status !== "SUCCEEDED") {
      return apiError("Execute the migration (Apply) successfully before transferring data", 400);
    }

    const eligible = plan.resources.filter(
      (r) => r.awsService === "S3_BUCKET" && r.gcpResourceSelfLink,
    );
    if (eligible.length === 0) {
      return apiError(
        "No provisioned S3→GCS resources on this plan — data transfer v1 only supports S3 buckets",
        400,
      );
    }

    await reconcileStaleTransferRuns(admin.tenantId);

    const active = await getActiveTransferRun(admin.tenantId, id);
    if (active) {
      return apiError("A data transfer is already in progress for this plan", 409);
    }

    const transferRun = await createTransferRun(admin.tenantId, id);

    await enqueueJob(
      {
        type: "DATA_TRANSFER",
        tenantId: admin.tenantId,
        runId: transferRun.id,
        migrationPlanId: id,
      },
      { after },
    );

    await logAdminAction({
      tenantId: admin.tenantId,
      adminId: admin.id,
      adminEmail: admin.email,
      action: "DATA_TRANSFER_STARTED",
      targetType: "MigrationPlan",
      targetId: id,
    });

    return apiSuccess({ transferRun: serializeTransferRun(transferRun) }, 202);
  } catch (error) {
    console.error("Starting data transfer failed:", error);
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
    await reconcileStaleTransferRuns(admin.tenantId);

    const transferRun = await getLatestTransferRun(admin.tenantId, id);
    return apiSuccess({ transferRun: serializeTransferRun(transferRun) });
  } catch (error) {
    console.error("Fetching transfer run failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
