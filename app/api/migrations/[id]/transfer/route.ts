import { after } from "next/server";
import { requireTenantAdmin, requireTenantScope } from "@/lib/auth/guard";
import { getMigrationPlan } from "@/lib/migrations";
import { getLatestApplyRun } from "@/lib/apply-runs";
import {
  getActiveTransferRun,
  getLatestTransferRun,
  createTransferRun,
  reconcileStaleTransferRuns,
} from "@/lib/transfer-runs";
import { apiError, apiErrorFromAuth, apiSuccess } from "@/lib/api/response";
import { logAdminAction } from "@/lib/admin-action-log";
import { enqueueJob } from "@/lib/jobs/enqueue";
import { getJobRuntime } from "@/lib/jobs/types";
import type { TransferRdsCredential } from "@/lib/jobs/types";
import { createRdsCredentialsSecret } from "@/lib/transfer/rds-credentials-secret";

function serializeTransferRun<T extends { bytesCopied: bigint | null } | null>(run: T) {
  if (!run) return null;
  return {
    ...run,
    bytesCopied: run.bytesCopied == null ? null : run.bytesCopied.toString(),
  };
}

type TransferBody = {
  rdsCredentials?: Array<{
    migrationResourceId?: unknown;
    username?: unknown;
    password?: unknown;
  }>;
};

function parseRdsCredentials(body: TransferBody): TransferRdsCredential[] {
  if (!body.rdsCredentials) return [];
  if (!Array.isArray(body.rdsCredentials)) {
    throw new Error("rdsCredentials must be an array");
  }
  const out: TransferRdsCredential[] = [];
  for (const item of body.rdsCredentials) {
    if (!item || typeof item.migrationResourceId !== "string" || !item.migrationResourceId) {
      throw new Error("Each rdsCredentials entry needs migrationResourceId");
    }
    if (typeof item.password !== "string" || !item.password) {
      throw new Error("Each rdsCredentials entry needs a non-empty password");
    }
    out.push({
      migrationResourceId: item.migrationResourceId,
      password: item.password,
      ...(typeof item.username === "string" && item.username.trim()
        ? { username: item.username.trim() }
        : {}),
    });
  }
  return out;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try {
    admin = await requireTenantAdmin();
  } catch (error) {
    return apiErrorFromAuth(error);
  }

  try {
    const { id } = await params;

    const plan = await getMigrationPlan(admin.tenantId, id);
    if (!plan) {
      return apiError("Migration plan not found", 404);
    }
    if (plan.status !== "APPROVED") {
      return apiError("Only an approved migration plan can run data transfer", 400);
    }

    const applyRun = await getLatestApplyRun(admin.tenantId, id);
    if (!applyRun || applyRun.status !== "SUCCEEDED") {
      return apiError("Execute the migration (Apply) successfully before transferring data", 400);
    }

    let body: TransferBody = {};
    try {
      body = (await request.json()) as TransferBody;
    } catch {
      body = {};
    }

    let rdsCredentials: TransferRdsCredential[];
    try {
      rdsCredentials = parseRdsCredentials(body);
    } catch (error) {
      return apiError(error instanceof Error ? error.message : "Invalid rdsCredentials", 400);
    }

    const eligibleS3 = plan.resources.filter(
      (r) => r.awsService === "S3_BUCKET" && r.gcpResourceSelfLink,
    );
    const eligibleRds = plan.resources.filter(
      (r) => r.awsService === "RDS_INSTANCE" && r.gcpResourceSelfLink,
    );

    if (eligibleS3.length === 0 && eligibleRds.length === 0) {
      return apiError(
        "No provisioned S3→GCS or RDS→Cloud SQL resources on this plan — run Apply first",
        400,
      );
    }

    for (const rds of eligibleRds) {
      if (!rdsCredentials.some((c) => c.migrationResourceId === rds.id)) {
        return apiError(
          `Password required for RDS instance ${rds.awsResourceName ?? rds.awsResourceId}`,
          400,
        );
      }
    }

    // Drop credentials for resources that are not eligible (ignore extras silently).
    const allowedIds = new Set(eligibleRds.map((r) => r.id));
    rdsCredentials = rdsCredentials.filter((c) => allowedIds.has(c.migrationResourceId));

    await reconcileStaleTransferRuns(admin.tenantId);

    const active = await getActiveTransferRun(admin.tenantId, id);
    if (active) {
      return apiError("A data transfer is already in progress for this plan", 409);
    }

    const transferRun = await createTransferRun(admin.tenantId, id);

    const runtime = getJobRuntime("DATA_TRANSFER");
    let rdsCredentialsSecret: string | undefined;
    if (rdsCredentials.length > 0 && runtime === "k8s-job") {
      rdsCredentialsSecret = await createRdsCredentialsSecret(transferRun.id, rdsCredentials);
    }

    await enqueueJob(
      {
        type: "DATA_TRANSFER",
        tenantId: admin.tenantId,
        runId: transferRun.id,
        migrationPlanId: id,
        ...(rdsCredentialsSecret ? { rdsCredentialsSecret } : {}),
        ...(runtime === "inline" && rdsCredentials.length > 0
          ? { rdsCredentials }
          : {}),
      },
      { after },
    );

    await logAdminAction({
      tenantId: admin.tenantId,
      adminId: admin.id,
      adminEmail: admin.email,
      action: "DATA_TRANSFER_STARTED",
      targetType: "MigrationPlan",
      targetId: id,
    });

    return apiSuccess({ transferRun: serializeTransferRun(transferRun) }, 202);
  } catch (error) {
    console.error("Starting data transfer failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try {
    admin = await requireTenantScope();
  } catch (error) {
    return apiErrorFromAuth(error);
  }

  try {
    const { id } = await params;
    await reconcileStaleTransferRuns(admin.tenantId);

    const transferRun = await getLatestTransferRun(admin.tenantId, id);
    return apiSuccess({ transferRun: serializeTransferRun(transferRun) });
  } catch (error) {
    console.error("Fetching transfer run failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
