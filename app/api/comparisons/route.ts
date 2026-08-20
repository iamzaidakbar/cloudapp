import { after, NextRequest } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { requireAdmin } from "@/lib/auth/guard";
import { getTenantWithConnection } from "@/lib/tenant";
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
import { apiError, apiSuccess } from "@/lib/api/response";

export async function POST() {
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

    await reconcileStaleComparisonRuns(tenant.id);

    const active = await getActiveComparisonRun(tenant.id);
    if (active) {
      return apiError("A comparison is already in progress", 409);
    }

    const sourceAuditRun = await getLatestSucceededAuditRun(tenant.id);
    if (!sourceAuditRun) {
      return apiError("Run a successful audit before comparing AWS to GCP", 400);
    }

    const itemCount = await withTenantContext(tenant.id, (tx) =>
      tx.auditResource.count({
        where: { auditRunId: sourceAuditRun.id, service: { in: COMPARABLE_SERVICE_TYPES } },
      }),
    );

    const awsDataSource = isAwsConfigured() ? "AWS" : "DEV_ADAPTER";
    const gcpDataSource = isGcpBillingConfigured() ? "GCP" : "DEV_ADAPTER";
    const comparisonRun = await createComparisonRun(
      tenant.id,
      sourceAuditRun.id,
      itemCount,
      awsDataSource,
      gcpDataSource,
    );

    after(() =>
      runComparison(comparisonRun.id, tenant.id).catch((error) =>
        console.error("Comparison run failed unexpectedly:", error),
      ),
    );

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

    await reconcileStaleComparisonRuns(tenant.id);

    const { page, pageSize, skip, take } = parsePagination(request.nextUrl.searchParams);
    const { items, total } = await listComparisonRuns(tenant.id, skip, take);

    return apiSuccess({ items, ...paginationMeta(page, pageSize, total) });
  } catch (error) {
    console.error("Listing comparisons failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
