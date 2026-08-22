import { requireTenantScope } from "@/lib/auth/guard";
import { getAuditRun, listAuditFindings } from "@/lib/audits";
import { csvResponse, rowsToCsv } from "@/lib/csv";
import { apiError, apiErrorFromAuth } from "@/lib/api/response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let admin;
  try {
    admin = await requireTenantScope();
  } catch (error) {
    return apiErrorFromAuth(error);
  }

  try {
    const { id } = await params;
    const auditRun = await getAuditRun(admin.tenantId, id);
    if (!auditRun) {
      return apiError("Audit run not found", 404);
    }

    const { total } = await listAuditFindings(admin.tenantId, id, {}, 0, 1);
    const { items } = await listAuditFindings(
      admin.tenantId,
      id,
      {},
      0,
      Math.max(total, 1),
    );

    const csv = rowsToCsv(
      [
        "severity",
        "type",
        "title",
        "description",
        "remediation",
        "service",
        "resourceName",
        "resourceId",
        "createdAt",
      ],
      items.map((f) => [
        f.severity,
        f.type,
        f.title,
        f.description,
        f.remediation,
        f.resource?.service ?? "",
        f.resource?.name ?? "",
        f.resource?.resourceId ?? "",
        f.createdAt.toISOString(),
      ]),
    );

    return csvResponse(`audit-${auditRun.version}-findings.csv`, csv);
  } catch (error) {
    console.error("Exporting audit findings failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
