import { requireAdmin } from "@/lib/auth/guard";
import { getTenantWithConnection } from "@/lib/tenant";
import { cancelMigrationPlan, getMigrationPlan } from "@/lib/migrations";
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

    const result = await cancelMigrationPlan(tenant.id, id);
    if (result.count === 0) {
      return apiError("Migration plan not found or already approved/cancelled", 400);
    }

    const migrationPlan = await getMigrationPlan(tenant.id, id);
    return apiSuccess({ migrationPlan });
  } catch (error) {
    console.error("Cancelling migration plan failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
