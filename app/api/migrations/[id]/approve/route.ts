import { requireAdmin } from "@/lib/auth/guard";
import { getTenantWithConnection } from "@/lib/tenant";
import { approveMigrationPlan, getMigrationPlan } from "@/lib/migrations";
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

    const result = await approveMigrationPlan(tenant.id, id, admin.id);
    if (result.count === 0) {
      return apiError("Migration plan not found or already approved/cancelled", 400);
    }

    const migrationPlan = await getMigrationPlan(tenant.id, id);

    await logAdminAction({
      tenantId: tenant.id,
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
