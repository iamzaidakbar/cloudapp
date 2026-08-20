import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { getTenantWithConnection } from "@/lib/tenant";
import { listAuditFindings } from "@/lib/audits";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { findingsQuerySchema } from "@/lib/validation/audit";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const searchParams = request.nextUrl.searchParams;
    const { severity, type } = findingsQuerySchema.parse({
      severity: searchParams.get("severity") ?? undefined,
      type: searchParams.get("type") ?? undefined,
    });
    const { page, pageSize, skip, take } = parsePagination(searchParams);

    const { items, total } = await listAuditFindings(tenant.id, id, { severity, type }, skip, take);

    return apiSuccess({ items, ...paginationMeta(page, pageSize, total) });
  } catch (error) {
    console.error("Listing audit findings failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
