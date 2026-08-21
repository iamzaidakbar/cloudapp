import { requireTenantScope } from "@/lib/auth/guard";
import { reconcileStaleComparisonRuns } from "@/lib/pricing/reconcile";
import { getComparisonRun } from "@/lib/comparisons";
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
    await reconcileStaleComparisonRuns(admin.tenantId);

    const comparisonRun = await getComparisonRun(admin.tenantId, id);
    if (!comparisonRun) {
      return apiError("Comparison run not found", 404);
    }

    return apiSuccess({ comparisonRun });
  } catch (error) {
    console.error("Fetching comparison run failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
