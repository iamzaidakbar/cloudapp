import { requireAdmin } from "@/lib/auth/guard";
import { getTenantWithConnection } from "@/lib/tenant";
import { getMigrationPlan } from "@/lib/migrations";
import { apiError, apiSuccess } from "@/lib/api/response";

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

    const migrationPlan = await getMigrationPlan(tenant.id, id);
    if (!migrationPlan) {
      return apiError("Migration plan not found", 404);
    }

    return apiSuccess({ migrationPlan });
  } catch (error) {
    console.error("Fetching migration plan failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
