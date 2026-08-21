import { NextRequest } from "next/server";
import { requireTenantAdmin, requireTenantScope } from "@/lib/auth/guard";
import { createMigrationPlan, getSelectableComparisonItems, listMigrationPlans } from "@/lib/migrations";
import { createMigrationPlanSchema } from "@/lib/validation/migration";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { apiError, apiErrorFromAuth, apiSuccess } from "@/lib/api/response";
import { logAdminAction } from "@/lib/admin-action-log";

export async function POST(request: NextRequest) {
  let admin;
  try {
    admin = await requireTenantAdmin();
  } catch (error) {
    return apiErrorFromAuth(error);
  }

  try {
    const body = await request.json();
    const parsed = createMigrationPlanSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid request", 400, parsed.error.flatten().fieldErrors);
    }

    const selectable = await getSelectableComparisonItems(admin.tenantId);
    if (!selectable) {
      return apiError("Run a successful AWS to GCP comparison first", 400);
    }

    const selectedIds = new Set(parsed.data.comparisonItemIds);
    const items = selectable.items.filter((item) => selectedIds.has(item.id));
    if (items.length !== selectedIds.size) {
      return apiError("One or more selected resources are no longer available in the latest comparison", 400);
    }

    const plan = await createMigrationPlan(admin.tenantId, selectable.comparisonRunId, items);

    await logAdminAction({
      tenantId: admin.tenantId,
      adminId: admin.id,
      adminEmail: admin.email,
      action: "MIGRATION_PLAN_CREATED",
      targetType: "MigrationPlan",
      targetId: plan.id,
      detail: { sequenceNumber: plan.sequenceNumber, resourceCount: plan.resourceCount },
    });

    return apiSuccess({ migrationPlan: plan }, 201);
  } catch (error) {
    console.error("Creating migration plan failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}

export async function GET(request: NextRequest) {
  let admin;
  try {
    admin = await requireTenantScope();
  } catch (error) {
    return apiErrorFromAuth(error);
  }

  try {
    const { page, pageSize, skip, take } = parsePagination(request.nextUrl.searchParams);
    const { items, total } = await listMigrationPlans(admin.tenantId, skip, take);

    return apiSuccess({ items, ...paginationMeta(page, pageSize, total) });
  } catch (error) {
    console.error("Listing migration plans failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
