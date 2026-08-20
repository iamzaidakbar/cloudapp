import { requireAdmin } from "@/lib/auth/guard";
import { getTenantWithConnection } from "@/lib/tenant";
import { reconcileStaleAuditRuns } from "@/lib/aws/audit/reconcile";
import { getAuditRun } from "@/lib/audits";
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

    await reconcileStaleAuditRuns(tenant.id);

    const auditRun = await getAuditRun(tenant.id, id);
    if (!auditRun) {
      return apiError("Audit run not found", 404);
    }

    return apiSuccess({ auditRun });
  } catch (error) {
    console.error("Fetching audit run failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
