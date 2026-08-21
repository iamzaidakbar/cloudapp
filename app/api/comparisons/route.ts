import { after, NextRequest } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { requireTenantAdmin, requireTenantScope } from "@/lib/auth/guard";
import { reconcileStaleComparisonRuns } from "@/lib/pricing/reconcile";
import {
  createComparisonRun,
  getActiveComparisonRun,
  getLatestSucceededAuditRun,
  listComparisonRuns,
} from "@/lib/comparisons";
import { runComparison } from "@/lib/pricing/run-comparison";
import { isAwsConfigured } from "@/lib/aws/is-configured";
import { isGcpBillingConfigured } from "@/lib/gcp/is-configured";
import { COMPARABLE_SERVICE_TYPES } from "@/lib/pricing/types";
import { withTenantContext } from "@/lib/db/with-tenant";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { apiError, apiErrorFromAuth, apiSuccess } from "@/lib/api/response";
import { logAdminAction } from "@/lib/admin-action-log";

export async function POST() {
  let admin;
  try {
    admin = await requireTenantAdmin();
  } catch (error) {
    return apiErrorFromAuth(error);
  }

  try {
    await reconcileStaleComparisonRuns(admin.tenantId);

    const active = await getActiveComparisonRun(admin.tenantId);
    if (active) {
      return apiError("A comparison is already in progress", 409);
    }

    const sourceAuditRun = await getLatestSucceededAuditRun(admin.tenantId);
    if (!sourceAuditRun) {
      return apiError("Run a successful audit before comparing AWS to GCP", 400);
    }

    const itemCount = await withTenantContext(admin.tenantId, (tx) =>
      tx.auditResource.count({
        where: { auditRunId: sourceAuditRun.id, service: { in: COMPARABLE_SERVICE_TYPES } },
      }),
    );

    const awsDataSource = isAwsConfigured() ? "AWS" : "DEV_ADAPTER";
    const gcpDataSource = isGcpBillingConfigured() ? "GCP" : "DEV_ADAPTER";
    const comparisonRun = await createComparisonRun(
      admin.tenantId,
      sourceAuditRun.id,
      itemCount,
      awsDataSource,
      gcpDataSource,
    );

    after(() =>
      runComparison(comparisonRun.id, admin.tenantId).catch((error) =>
        console.error("Comparison run failed unexpectedly:", error),
      ),
    );

    await logAdminAction({
      tenantId: admin.tenantId,
      adminId: admin.id,
      adminEmail: admin.email,
      action: "COMPARISON_STARTED",
      targetType: "ComparisonRun",
      targetId: comparisonRun.id,
    });

    return apiSuccess({ comparisonRun }, 202);
  } catch (error) {
    // Same race as POST /api/audits: two near-simultaneous requests can both
    // pass the getActiveComparisonRun() check before either row is inserted.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError("A comparison is already in progress", 409);
    }
    console.error("Starting comparison failed:", error);
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
    await reconcileStaleComparisonRuns(admin.tenantId);

    const { page, pageSize, skip, take } = parsePagination(request.nextUrl.searchParams);
    const { items, total } = await listComparisonRuns(admin.tenantId, skip, take);

    return apiSuccess({ items, ...paginationMeta(page, pageSize, total) });
  } catch (error) {
    console.error("Listing comparisons failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
