import { requireTenantScope } from "@/lib/auth/guard";
import { reconcileStaleAuditRuns } from "@/lib/aws/audit/reconcile";
import { getAuditRun } from "@/lib/audits";
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
    await reconcileStaleAuditRuns(admin.tenantId);

    const auditRun = await getAuditRun(admin.tenantId, id);
    if (!auditRun) {
      return apiError("Audit run not found", 404);
    }

    return apiSuccess({ auditRun });
  } catch (error) {
    console.error("Fetching audit run failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
