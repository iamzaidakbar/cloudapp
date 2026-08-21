import { requireTenantScope } from "@/lib/auth/guard";
import { getMigrationPlan } from "@/lib/migrations";
import { apiError, apiErrorFromAuth, apiSuccess } from "@/lib/api/response";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try {
    admin = await requireTenantScope();
  } catch (error) {
    return apiErrorFromAuth(error);
  }

  try {
    const { id } = await params;
    const migrationPlan = await getMigrationPlan(admin.tenantId, id);
    if (!migrationPlan) {
      return apiError("Migration plan not found", 404);
    }

    return apiSuccess({ migrationPlan });
  } catch (error) {
    console.error("Fetching migration plan failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
