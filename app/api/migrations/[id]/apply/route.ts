import { after } from "next/server";
import { requireTenantAdmin, requireTenantScope } from "@/lib/auth/guard";
import { getMigrationPlan } from "@/lib/migrations";
import { getLatestTerraformRun } from "@/lib/terraform-runs";
import { getActiveApplyRun, getLatestApplyRun, createApplyRun } from "@/lib/apply-runs";
import { runApply } from "@/lib/terraform/run-apply";
import { reconcileStaleApplyRuns } from "@/lib/terraform/reconcile";
import { apiError, apiErrorFromAuth, apiSuccess } from "@/lib/api/response";
import { logAdminAction } from "@/lib/admin-action-log";

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
      return apiError("Only an approved migration plan can be executed", 400);
    }

    const terraformRun = await getLatestTerraformRun(admin.tenantId, id);
    if (!terraformRun || terraformRun.status !== "SUCCEEDED" || !terraformRun.planSucceeded) {
      return apiError("Generate Terraform and confirm a successful plan before executing", 400);
    }

    await reconcileStaleApplyRuns(admin.tenantId);

    const active = await getActiveApplyRun(admin.tenantId, id);
    if (active) {
      return apiError("An apply is already in progress for this plan", 409);
    }

    const applyRun = await createApplyRun(admin.tenantId, id);

    after(() =>
      runApply(applyRun.id, admin.tenantId).catch((error) => console.error("Apply run failed unexpectedly:", error)),
    );

    await logAdminAction({
      tenantId: admin.tenantId,
      adminId: admin.id,
      adminEmail: admin.email,
      action: "MIGRATION_APPLIED",
      targetType: "MigrationPlan",
      targetId: id,
    });

    return apiSuccess({ applyRun }, 202);
  } catch (error) {
    console.error("Starting apply failed:", error);
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
    await reconcileStaleApplyRuns(admin.tenantId);

    const applyRun = await getLatestApplyRun(admin.tenantId, id);
    return apiSuccess({ applyRun });
  } catch (error) {
    console.error("Fetching apply run failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
