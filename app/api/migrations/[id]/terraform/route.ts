import { after } from "next/server";
import { requireTenantAdmin, requireTenantScope } from "@/lib/auth/guard";
import { getMigrationPlan } from "@/lib/migrations";
import { getActiveTerraformRun, getLatestTerraformRun, createTerraformRun, getTerraformSourceResources } from "@/lib/terraform-runs";
import { generateTerraformConfig } from "@/lib/terraform/generate";
import { reconcileStaleTerraformRuns } from "@/lib/terraform/reconcile";
import { env } from "@/lib/env";
import { apiError, apiErrorFromAuth, apiSuccess } from "@/lib/api/response";
import { logAdminAction } from "@/lib/admin-action-log";
import { enqueueJob } from "@/lib/jobs/enqueue";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try {
    admin = await requireTenantAdmin();
  } catch (error) {
    return apiErrorFromAuth(error);
  }

  try {
    const { id } = await params;

    if (!env.GCP_PROJECT_ID) {
      return apiError("Set GCP_PROJECT_ID before generating Terraform", 400);
    }

    const plan = await getMigrationPlan(admin.tenantId, id);
    if (!plan) {
      return apiError("Migration plan not found", 404);
    }
    if (plan.status !== "APPROVED") {
      return apiError("Only an approved migration plan can have Terraform generated", 400);
    }

    await reconcileStaleTerraformRuns(admin.tenantId);

    const active = await getActiveTerraformRun(admin.tenantId, id);
    if (active) {
      return apiError("A Terraform run is already in progress for this plan", 409);
    }

    const resources = await getTerraformSourceResources(admin.tenantId, id);
    const terraformConfig = generateTerraformConfig(resources, env.GCP_PROJECT_ID);
    const terraformRun = await createTerraformRun(admin.tenantId, id, terraformConfig);

    await enqueueJob(
      {
        type: "TERRAFORM",
        tenantId: admin.tenantId,
        runId: terraformRun.id,
        migrationPlanId: id,
      },
      { after },
    );

    await logAdminAction({
      tenantId: admin.tenantId,
      adminId: admin.id,
      adminEmail: admin.email,
      action: "TERRAFORM_GENERATED",
      targetType: "MigrationPlan",
      targetId: id,
    });

    return apiSuccess({ terraformRun }, 202);
  } catch (error) {
    console.error("Starting Terraform generation failed:", error);
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
    await reconcileStaleTerraformRuns(admin.tenantId);

    const terraformRun = await getLatestTerraformRun(admin.tenantId, id);
    return apiSuccess({ terraformRun });
  } catch (error) {
    console.error("Fetching Terraform run failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
