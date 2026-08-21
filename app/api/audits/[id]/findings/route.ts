import { NextRequest } from "next/server";
import { requireTenantScope } from "@/lib/auth/guard";
import { listAuditFindings } from "@/lib/audits";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { findingsQuerySchema } from "@/lib/validation/audit";
import { apiError, apiErrorFromAuth, apiSuccess } from "@/lib/api/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try {
    admin = await requireTenantScope();
  } catch (error) {
    return apiErrorFromAuth(error);
  }

  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const { severity, type } = findingsQuerySchema.parse({
      severity: searchParams.get("severity") ?? undefined,
      type: searchParams.get("type") ?? undefined,
    });
    const { page, pageSize, skip, take } = parsePagination(searchParams);

    const { items, total } = await listAuditFindings(admin.tenantId, id, { severity, type }, skip, take);

    return apiSuccess({ items, ...paginationMeta(page, pageSize, total) });
  } catch (error) {
    console.error("Listing audit findings failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
