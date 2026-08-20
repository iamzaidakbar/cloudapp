import { after } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { getTenantWithConnection } from "@/lib/tenant";
import { getMigrationPlan } from "@/lib/migrations";
import { getActiveTerraformRun, getLatestTerraformRun, createTerraformRun, getTerraformSourceResources } from "@/lib/terraform-runs";
import { generateTerraformConfig } from "@/lib/terraform/generate";
import { runTerraformCli } from "@/lib/terraform/run-terraform";
import { reconcileStaleTerraformRuns } from "@/lib/terraform/reconcile";
import { env } from "@/lib/env";
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

    if (!env.GCP_PROJECT_ID) {
      return apiError("Set GCP_PROJECT_ID before generating Terraform", 400);
    }

    const plan = await getMigrationPlan(tenant.id, id);
    if (!plan) {
      return apiError("Migration plan not found", 404);
    }
    if (plan.status !== "APPROVED") {
      return apiError("Only an approved migration plan can have Terraform generated", 400);
    }

    await reconcileStaleTerraformRuns(tenant.id);

    const active = await getActiveTerraformRun(tenant.id, id);
    if (active) {
      return apiError("A Terraform run is already in progress for this plan", 409);
    }

    const resources = await getTerraformSourceResources(tenant.id, id);
    const terraformConfig = generateTerraformConfig(resources, env.GCP_PROJECT_ID);
    const terraformRun = await createTerraformRun(tenant.id, id, terraformConfig);

    after(() =>
      runTerraformCli(terraformRun.id, tenant.id).catch((error) =>
        console.error("Terraform run failed unexpectedly:", error),
      ),
    );

    return apiSuccess({ terraformRun }, 202);
  } catch (error) {
    console.error("Starting Terraform generation failed:", error);
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

    await reconcileStaleTerraformRuns(tenant.id);

    const terraformRun = await getLatestTerraformRun(tenant.id, id);
    return apiSuccess({ terraformRun });
  } catch (error) {
    console.error("Fetching Terraform run failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
