import { after } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { getTenantWithConnection } from "@/lib/tenant";
import { getMigrationPlan } from "@/lib/migrations";
import { getLatestTerraformRun } from "@/lib/terraform-runs";
import { getActiveApplyRun, getLatestApplyRun, createApplyRun } from "@/lib/apply-runs";
import { runApply } from "@/lib/terraform/run-apply";
import { reconcileStaleApplyRuns } from "@/lib/terraform/reconcile";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const plan = await getMigrationPlan(tenant.id, id);
    if (!plan) {
      return apiError("Migration plan not found", 404);
    }
    if (plan.status !== "APPROVED") {
      return apiError("Only an approved migration plan can be executed", 400);
    }

    const terraformRun = await getLatestTerraformRun(tenant.id, id);
    if (!terraformRun || terraformRun.status !== "SUCCEEDED" || !terraformRun.planSucceeded) {
      return apiError("Generate Terraform and confirm a successful plan before executing", 400);
    }

    await reconcileStaleApplyRuns(tenant.id);

    const active = await getActiveApplyRun(tenant.id, id);
    if (active) {
      return apiError("An apply is already in progress for this plan", 409);
    }

    const applyRun = await createApplyRun(tenant.id, id);

    after(() =>
      runApply(applyRun.id, tenant.id).catch((error) => console.error("Apply run failed unexpectedly:", error)),
    );

    return apiSuccess({ applyRun }, 202);
  } catch (error) {
    console.error("Starting apply failed:", error);
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

    await reconcileStaleApplyRuns(tenant.id);

    const applyRun = await getLatestApplyRun(tenant.id, id);
    return apiSuccess({ applyRun });
  } catch (error) {
    console.error("Fetching apply run failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
