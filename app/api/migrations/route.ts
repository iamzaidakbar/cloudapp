import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { getTenantWithConnection } from "@/lib/tenant";
import { createMigrationPlan, getSelectableComparisonItems, listMigrationPlans } from "@/lib/migrations";
import { createMigrationPlanSchema } from "@/lib/validation/migration";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return apiError("Unauthorized", 401);
  }

  try {
    const { tenant } = await getTenantWithConnection();
    if (!tenant) {
      return apiError("Organization not configured", 404);
    }

    const body = await request.json();
    const parsed = createMigrationPlanSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid request", 400, parsed.error.flatten().fieldErrors);
    }

    const selectable = await getSelectableComparisonItems(tenant.id);
    if (!selectable) {
      return apiError("Run a successful AWS to GCP comparison first", 400);
    }

    const selectedIds = new Set(parsed.data.comparisonItemIds);
    const items = selectable.items.filter((item) => selectedIds.has(item.id));
    if (items.length !== selectedIds.size) {
      return apiError("One or more selected resources are no longer available in the latest comparison", 400);
    }

    const plan = await createMigrationPlan(tenant.id, selectable.comparisonRunId, items);

    return apiSuccess({ migrationPlan: plan }, 201);
  } catch (error) {
    console.error("Creating migration plan failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return apiError("Unauthorized", 401);
  }

  try {
    const { tenant } = await getTenantWithConnection();
    if (!tenant) {
      return apiSuccess({ items: [], ...paginationMeta(1, 25, 0) });
    }

    const { page, pageSize, skip, take } = parsePagination(request.nextUrl.searchParams);
    const { items, total } = await listMigrationPlans(tenant.id, skip, take);

    return apiSuccess({ items, ...paginationMeta(page, pageSize, total) });
  } catch (error) {
    console.error("Listing migration plans failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
