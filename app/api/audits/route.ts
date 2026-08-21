import { after, NextRequest } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { requireTenantAdmin, requireTenantScope } from "@/lib/auth/guard";
import { getTenantWithConnection } from "@/lib/tenant";
import { reconcileStaleAuditRuns } from "@/lib/aws/audit/reconcile";
import { createAuditRun, getActiveAuditRun, listAuditRuns } from "@/lib/audits";
import { runAudit } from "@/lib/aws/audit/run-audit";
import { isAwsConfigured } from "@/lib/aws/is-configured";
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
    const { connection } = await getTenantWithConnection(admin.tenantId);
    if (!connection) {
      return apiError("Organization not configured", 404);
    }
    if (connection.status !== "CONNECTED" || !connection.roleArn) {
      return apiError("Connect an AWS account before running an audit", 400);
    }

    await reconcileStaleAuditRuns(admin.tenantId);

    const active = await getActiveAuditRun(admin.tenantId);
    if (active) {
      return apiError("An audit is already in progress", 409);
    }

    const dataSource = isAwsConfigured() ? "AWS" : "DEV_ADAPTER";
    const auditRun = await createAuditRun(admin.tenantId, dataSource);

    after(() =>
      runAudit(auditRun.id, admin.tenantId).catch((error) => console.error("Audit run failed unexpectedly:", error)),
    );

    await logAdminAction({
      tenantId: admin.tenantId,
      adminId: admin.id,
      adminEmail: admin.email,
      action: "AUDIT_STARTED",
      targetType: "AuditRun",
      targetId: auditRun.id,
    });

    return apiSuccess({ auditRun }, 202);
  } catch (error) {
    // Two near-simultaneous requests can both pass the getActiveAuditRun()
    // check before either has inserted its row, then race on the
    // (tenantId, version) unique constraint — treat that exactly like the
    // normal already-in-progress case rather than a generic failure.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError("An audit is already in progress", 409);
    }
    console.error("Starting audit failed:", error);
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
    await reconcileStaleAuditRuns(admin.tenantId);

    const { page, pageSize, skip, take } = parsePagination(request.nextUrl.searchParams);
    const { items, total } = await listAuditRuns(admin.tenantId, skip, take);

    return apiSuccess({ items, ...paginationMeta(page, pageSize, total) });
  } catch (error) {
    console.error("Listing audits failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
