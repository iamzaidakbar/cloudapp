import { requireTenantAdmin } from "@/lib/auth/guard";
import { approveMigrationPlan, getMigrationPlan } from "@/lib/migrations";
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
    const result = await approveMigrationPlan(admin.tenantId, id, admin.id);
    if (result.count === 0) {
      return apiError("Migration plan not found or already approved/cancelled", 400);
    }

    const migrationPlan = await getMigrationPlan(admin.tenantId, id);

    await logAdminAction({
      tenantId: admin.tenantId,
      adminId: admin.id,
      adminEmail: admin.email,
      action: "MIGRATION_APPROVED",
      targetType: "MigrationPlan",
      targetId: id,
    });

    return apiSuccess({ migrationPlan });
  } catch (error) {
    console.error("Approving migration plan failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
