import { requireAdmin } from "@/lib/auth/guard";
import { getTenantWithConnection } from "@/lib/tenant";
import { reconcileStaleComparisonRuns } from "@/lib/pricing/reconcile";
import { getComparisonRun } from "@/lib/comparisons";
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

    await reconcileStaleComparisonRuns(tenant.id);

    const comparisonRun = await getComparisonRun(tenant.id, id);
    if (!comparisonRun) {
      return apiError("Comparison run not found", 404);
    }

    return apiSuccess({ comparisonRun });
  } catch (error) {
    console.error("Fetching comparison run failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
