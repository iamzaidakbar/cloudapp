import { requireAdmin } from "@/lib/auth/guard";
import { getTenantWithConnection } from "@/lib/tenant";
import { getMigrationPlan } from "@/lib/migrations";
import { createVerificationRun, getLatestVerificationRun } from "@/lib/verification-runs";
import { apiError, apiSuccess } from "@/lib/api/response";
import { logAdminAction } from "@/lib/admin-action-log";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try {
    admin = await requireAdmin();
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

    const hasProvisionedResource = plan.resources.some((r) => r.gcpResourceSelfLink);
    if (!hasProvisionedResource) {
      return apiError("No resources have been provisioned for this plan yet — execute the migration first.", 400);
    }

    const verificationRun = await createVerificationRun(tenant.id, id);

    await logAdminAction({
      tenantId: tenant.id,
      adminId: admin.id,
      adminEmail: admin.email,
      action: "VERIFICATION_RUN",
      targetType: "MigrationPlan",
      targetId: id,
    });

    return apiSuccess({ verificationRun });
  } catch (error) {
    console.error("Running verification failed:", error);
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

    const verificationRun = await getLatestVerificationRun(tenant.id, id);
    return apiSuccess({ verificationRun });
  } catch (error) {
    console.error("Fetching verification run failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
