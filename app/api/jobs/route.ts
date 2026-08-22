import { NextRequest } from "next/server";
import { requireTenantScope } from "@/lib/auth/guard";
import { listJobs, JOB_TYPES, JOB_STATUSES, type JobType, type JobRowStatus } from "@/lib/jobs";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { apiError, apiErrorFromAuth, apiSuccess } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  let admin;
  try {
    admin = await requireTenantScope();
  } catch (error) {
    return apiErrorFromAuth(error);
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, pageSize, skip, take } = parsePagination(searchParams);

    const typeParam = searchParams.get("type");
    const type =
      typeParam && (JOB_TYPES as readonly string[]).includes(typeParam)
        ? (typeParam as JobType)
        : undefined;
    const statusParam = searchParams.get("status");
    const status =
      statusParam && (JOB_STATUSES as readonly string[]).includes(statusParam)
        ? (statusParam as JobRowStatus)
        : undefined;

    const { items, total } = await listJobs(admin.tenantId, {
      skip,
      take,
      type,
      status,
    });

    return apiSuccess({ items, ...paginationMeta(page, pageSize, total) });
  } catch (error) {
    console.error("Listing jobs failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
