import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { getTenantWithConnection } from "@/lib/tenant";
import { listInfrastructureResources } from "@/lib/infrastructure";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { infrastructureQuerySchema } from "@/lib/validation/infrastructure";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return apiError("Unauthorized", 401);
  }

  try {
    const { tenant } = await getTenantWithConnection();
    if (!tenant) {
      return apiSuccess({
        items: [],
        ...paginationMeta(1, 25, 0),
        auditRunId: null,
        auditRunVersion: null,
        auditRunFinishedAt: null,
        dataSource: null,
        filterOptions: { services: [], regions: [], statuses: [] },
      });
    }

    const searchParams = request.nextUrl.searchParams;
    const filters = infrastructureQuerySchema.parse({
      service: searchParams.get("service") ?? undefined,
      region: searchParams.get("region") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      environment: searchParams.get("environment") ?? undefined,
      tag: searchParams.get("tag") ?? undefined,
      q: searchParams.get("q") ?? undefined,
    });
    const { page, pageSize, skip, take } = parsePagination(searchParams);

    const { items, total, auditRun, filterOptions } = await listInfrastructureResources(
      tenant.id,
      filters,
      skip,
      take,
    );

    return apiSuccess({
      items,
      ...paginationMeta(page, pageSize, total),
      auditRunId: auditRun?.id ?? null,
      auditRunVersion: auditRun?.version ?? null,
      auditRunFinishedAt: auditRun?.finishedAt ?? null,
      dataSource: auditRun?.dataSource ?? null,
      filterOptions,
    });
  } catch (error) {
    console.error("Listing infrastructure failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
