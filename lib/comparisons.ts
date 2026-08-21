import { withTenantContext } from "@/lib/db/with-tenant";
import { decimalToNumber } from "@/lib/decimal";
import type { ComparisonRun, ComparisonItem, GcpDataSource, VerificationSource } from "@/lib/generated/prisma/client";

function serializeComparisonRun<T extends ComparisonRun>(run: T) {
  return {
    ...run,
    totalAwsMonthlyCost: decimalToNumber(run.totalAwsMonthlyCost),
    totalGcpLikeForLikeCost: decimalToNumber(run.totalGcpLikeForLikeCost),
    totalGcpOptimizedCost: decimalToNumber(run.totalGcpOptimizedCost),
  };
}

function serializeComparisonItem<T extends ComparisonItem>(item: T) {
  return {
    ...item,
    currentAwsMonthlyCost: decimalToNumber(item.currentAwsMonthlyCost),
    gcpLikeForLikeMonthlyCost: decimalToNumber(item.gcpLikeForLikeMonthlyCost),
    gcpOptimizedMonthlyCost: decimalToNumber(item.gcpOptimizedMonthlyCost),
    estimatedMigrationCost: decimalToNumber(item.estimatedMigrationCost),
  };
}

export type SerializedComparisonRun = ReturnType<typeof serializeComparisonRun<ComparisonRun>>;

export async function getNextComparisonVersion(tenantId: string): Promise<number> {
  const latest = await withTenantContext(tenantId, (tx) =>
    tx.comparisonRun.findFirst({ where: { tenantId }, orderBy: { version: "desc" }, select: { version: true } }),
  );
  return (latest?.version ?? 0) + 1;
}

export async function getActiveComparisonRun(tenantId: string) {
  return withTenantContext(tenantId, (tx) =>
    tx.comparisonRun.findFirst({
      where: { tenantId, status: { in: ["QUEUED", "RUNNING"] } },
      orderBy: { version: "desc" },
    }),
  );
}

export async function getLatestSucceededAuditRun(tenantId: string) {
  return withTenantContext(tenantId, (tx) =>
    tx.auditRun.findFirst({ where: { tenantId, status: "SUCCEEDED" }, orderBy: { version: "desc" } }),
  );
}

export async function createComparisonRun(
  tenantId: string,
  sourceAuditRunId: string,
  itemCount: number,
  awsDataSource: VerificationSource,
  gcpDataSource: GcpDataSource,
) {
  const version = await getNextComparisonVersion(tenantId);
  return withTenantContext(tenantId, (tx) =>
    tx.comparisonRun.create({
      data: { tenantId, version, status: "QUEUED", sourceAuditRunId, itemCount, awsDataSource, gcpDataSource },
    }),
  );
}

export async function listComparisonRuns(tenantId: string, skip: number, take: number) {
  const [items, total, statusGroups, latestSucceeded] = await withTenantContext(
    tenantId,
    (tx) =>
      Promise.all([
        tx.comparisonRun.findMany({
          where: { tenantId },
          orderBy: { version: "desc" },
          skip,
          take,
        }),
        tx.comparisonRun.count({ where: { tenantId } }),
        tx.comparisonRun.groupBy({
          by: ["status"],
          where: { tenantId },
          _count: { _all: true },
        }),
        tx.comparisonRun.findFirst({
          where: { tenantId, status: "SUCCEEDED" },
          orderBy: { version: "desc" },
          select: {
            version: true,
            itemCount: true,
            totalAwsMonthlyCost: true,
            totalGcpOptimizedCost: true,
            costDataAvailable: true,
          },
        }),
      ]),
  );

  const countsByStatus = Object.fromEntries(
    statusGroups.map((row) => [row.status, row._count._all]),
  ) as Record<string, number>;

  const stats = {
    total,
    succeeded: countsByStatus.SUCCEEDED ?? 0,
    failed: countsByStatus.FAILED ?? 0,
    running: (countsByStatus.RUNNING ?? 0) + (countsByStatus.QUEUED ?? 0),
    latestSucceeded: latestSucceeded
      ? {
          version: latestSucceeded.version,
          itemCount: latestSucceeded.itemCount,
          totalAwsMonthlyCost: decimalToNumber(latestSucceeded.totalAwsMonthlyCost),
          totalGcpOptimizedCost: decimalToNumber(latestSucceeded.totalGcpOptimizedCost),
          costDataAvailable: latestSucceeded.costDataAvailable,
        }
      : null,
  };

  return { items: items.map(serializeComparisonRun), total, stats };
}

export async function getComparisonRun(tenantId: string, id: string) {
  const run = await withTenantContext(tenantId, (tx) =>
    tx.comparisonRun.findFirst({
      where: { id, tenantId },
      include: { items: { orderBy: [{ awsService: "asc" }, { awsResourceId: "asc" }] } },
    }),
  );
  if (!run) return null;
  return { ...serializeComparisonRun(run), items: run.items.map(serializeComparisonItem) };
}

export async function getLatestComparisonRun(tenantId: string) {
  const run = await withTenantContext(tenantId, (tx) =>
    tx.comparisonRun.findFirst({ where: { tenantId, status: "SUCCEEDED" }, orderBy: { version: "desc" } }),
  );
  return run ? serializeComparisonRun(run) : null;
}
