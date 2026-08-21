import { requireTenantAdmin, requireTenantScope } from "@/lib/auth/guard";
import { getMigrationPlan } from "@/lib/migrations";
import { createVerificationRun, getLatestVerificationRun } from "@/lib/verification-runs";
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

    const hasProvisionedResource = plan.resources.some((r) => r.gcpResourceSelfLink);
    if (!hasProvisionedResource) {
      return apiError("No resources have been provisioned for this plan yet — execute the migration first.", 400);
    }

    const verificationRun = await createVerificationRun(admin.tenantId, id);

    await logAdminAction({
      tenantId: admin.tenantId,
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
  let admin;
  try {
    admin = await requireTenantScope();
  } catch (error) {
    return apiErrorFromAuth(error);
  }

  try {
    const { id } = await params;
    const verificationRun = await getLatestVerificationRun(admin.tenantId, id);
    return apiSuccess({ verificationRun });
  } catch (error) {
    console.error("Fetching verification run failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
