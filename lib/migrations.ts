import { withTenantContext } from "@/lib/db/with-tenant";
import { decimalToNumber } from "@/lib/decimal";
import type { MigrationPlan, MigrationResource } from "@/lib/generated/prisma/client";

function serializeMigrationPlan<T extends MigrationPlan>(plan: T) {
  return {
    ...plan,
    estimatedMigrationCost: decimalToNumber(plan.estimatedMigrationCost),
    estimatedAwsMonthlyCost: decimalToNumber(plan.estimatedAwsMonthlyCost),
    estimatedGcpMonthlyCost: decimalToNumber(plan.estimatedGcpMonthlyCost),
  };
}

function serializeMigrationResource<T extends MigrationResource>(resource: T) {
  return { ...resource, estimatedMigrationCost: decimalToNumber(resource.estimatedMigrationCost) };
}

export type SerializedMigrationPlan = ReturnType<typeof serializeMigrationPlan<MigrationPlan>>;

// The shape createMigrationPlan needs per selected resource — matches what
// both the /migrations/new page (via getSelectableComparisonItems, below)
// and the POST /api/migrations route already have in hand as plain numbers,
// so no raw Prisma Decimal handling is needed at the call site.
export type SelectableComparisonItem = {
  id: string;
  awsService: MigrationResource["awsService"];
  awsResourceId: string;
  awsResourceName: string | null;
  region: string;
  awsSizeLabel: string | null;
  gcpService: string;
  gcpSizeLabel: string | null;
  currentAwsMonthlyCost: number | null;
  gcpOptimizedMonthlyCost: number | null;
  estimatedMigrationCost: number | null;
  costAvailable: boolean;
};

// The latest successful comparison's selectable (non-VPC — no standalone
// cost/migration action) items, serialized for both display on
// /migrations/new and as input to createMigrationPlan.
export async function getSelectableComparisonItems(
  tenantId: string,
): Promise<{ comparisonRunId: string; items: SelectableComparisonItem[] } | null> {
  const [run, provisioned] = await withTenantContext(tenantId, (tx) =>
    Promise.all([
      tx.comparisonRun.findFirst({
        where: { tenantId, status: "SUCCEEDED" },
        orderBy: { version: "desc" },
        include: { items: { where: { awsService: { not: "VPC" } }, orderBy: [{ awsService: "asc" }, { awsResourceId: "asc" }] } },
      }),
      // The same underlying AWS resource being selected into two different
      // migration plans is a real, confirmed failure mode: Terraform's
      // deterministically-named GCP resource address collides, and the
      // second plan's apply hits a real 409 "already exists" no matter how
      // many times it's retried — carrying forward state helps a *single*
      // plan's own re-applies, but can't help across plans, since each
      // plan's Terraform state is independent. Stop it at selection time
      // instead: gcpResourceSelfLink is only ever non-null while a resource
      // is genuinely still real (Rollback clears it back to null on a
      // confirmed destroy), so this check is self-correcting — a resource
      // becomes selectable again the moment it's actually torn down.
      tx.migrationResource.findMany({
        where: { tenantId, gcpResourceSelfLink: { not: null } },
        select: { awsResourceId: true },
      }),
    ]),
  );
  if (!run) return null;

  const provisionedResourceIds = new Set(provisioned.map((r) => r.awsResourceId));
  const items = run.items.filter((item) => !provisionedResourceIds.has(item.awsResourceId));

  return {
    comparisonRunId: run.id,
    items: items.map((item) => ({
      id: item.id,
      awsService: item.awsService,
      awsResourceId: item.awsResourceId,
      awsResourceName: item.awsResourceName,
      region: item.region,
      awsSizeLabel: item.awsSizeLabel,
      gcpService: item.gcpService,
      gcpSizeLabel: item.gcpSizeLabel,
      currentAwsMonthlyCost: decimalToNumber(item.currentAwsMonthlyCost),
      gcpOptimizedMonthlyCost: decimalToNumber(item.gcpOptimizedMonthlyCost),
      estimatedMigrationCost: decimalToNumber(item.estimatedMigrationCost),
      costAvailable: item.costAvailable,
    })),
  };
}

export async function getNextMigrationSequenceNumber(tenantId: string): Promise<number> {
  const latest = await withTenantContext(tenantId, (tx) =>
    tx.migrationPlan.findFirst({ where: { tenantId }, orderBy: { sequenceNumber: "desc" }, select: { sequenceNumber: true } }),
  );
  return (latest?.sequenceNumber ?? 0) + 1;
}

export async function listMigrationPlans(tenantId: string, skip: number, take: number) {
  const [items, total, statusGroups, latest] = await withTenantContext(tenantId, (tx) =>
    Promise.all([
      tx.migrationPlan.findMany({
        where: { tenantId },
        orderBy: { sequenceNumber: "desc" },
        skip,
        take,
      }),
      tx.migrationPlan.count({ where: { tenantId } }),
      tx.migrationPlan.groupBy({
        by: ["status"],
        where: { tenantId },
        _count: { _all: true },
      }),
      tx.migrationPlan.findFirst({
        where: { tenantId },
        orderBy: { sequenceNumber: "desc" },
        select: {
          sequenceNumber: true,
          status: true,
          resourceCount: true,
          estimatedMigrationCost: true,
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
    draft: countsByStatus.DRAFT ?? 0,
    approved: countsByStatus.APPROVED ?? 0,
    cancelled: countsByStatus.CANCELLED ?? 0,
    rolledBack: countsByStatus.ROLLED_BACK ?? 0,
    latest: latest
      ? {
          sequenceNumber: latest.sequenceNumber,
          status: latest.status,
          resourceCount: latest.resourceCount,
          estimatedMigrationCost: decimalToNumber(latest.estimatedMigrationCost),
          costDataAvailable: latest.costDataAvailable,
        }
      : null,
  };

  return { items: items.map(serializeMigrationPlan), total, stats };
}

export async function getMigrationPlan(tenantId: string, id: string) {
  const plan = await withTenantContext(tenantId, (tx) =>
    tx.migrationPlan.findFirst({
      where: { id, tenantId },
      include: { resources: { orderBy: [{ awsService: "asc" }, { awsResourceId: "asc" }] } },
    }),
  );
  if (!plan) return null;
  return { ...serializeMigrationPlan(plan), resources: plan.resources.map(serializeMigrationResource) };
}

export async function getLatestMigrationPlan(tenantId: string) {
  const plan = await withTenantContext(tenantId, (tx) =>
    tx.migrationPlan.findFirst({ where: { tenantId }, orderBy: { sequenceNumber: "desc" } }),
  );
  return plan ? serializeMigrationPlan(plan) : null;
}

// Synchronous — plan creation is a fast DB write from already-computed
// ComparisonItem data, not a background job (see the schema comment on
// MigrationPlan for why this isn't modeled as one).
export async function createMigrationPlan(tenantId: string, sourceComparisonRunId: string, items: SelectableComparisonItem[]) {
  const sequenceNumber = await getNextMigrationSequenceNumber(tenantId);

  const costDataAvailable = items.some((item) => item.costAvailable);
  const sum = (values: Array<number | null>) =>
    values.some((v) => v !== null) ? values.reduce((total: number, v) => total + (v ?? 0), 0) : null;

  const estimatedMigrationCost = sum(items.map((item) => item.estimatedMigrationCost));
  const estimatedAwsMonthlyCost = sum(items.map((item) => item.currentAwsMonthlyCost));
  const estimatedGcpMonthlyCost = sum(items.map((item) => item.gcpOptimizedMonthlyCost));

  return withTenantContext(tenantId, async (tx) => {
    const plan = await tx.migrationPlan.create({
      data: {
        tenantId,
        sequenceNumber,
        sourceComparisonRunId,
        resourceCount: items.length,
        estimatedMigrationCost,
        estimatedAwsMonthlyCost,
        estimatedGcpMonthlyCost,
        costDataAvailable,
      },
    });

    await tx.migrationResource.createMany({
      data: items.map((item) => ({
        tenantId,
        migrationPlanId: plan.id,
        comparisonItemId: item.id,
        awsService: item.awsService,
        awsResourceId: item.awsResourceId,
        awsResourceName: item.awsResourceName,
        region: item.region,
        awsSizeLabel: item.awsSizeLabel,
        gcpService: item.gcpService,
        gcpSizeLabel: item.gcpSizeLabel,
        estimatedMigrationCost: item.estimatedMigrationCost,
      })),
    });

    return plan;
  });
}

export async function approveMigrationPlan(tenantId: string, id: string, adminId: string) {
  return withTenantContext(tenantId, (tx) =>
    tx.migrationPlan.updateMany({
      where: { id, tenantId, status: "DRAFT" },
      data: { status: "APPROVED", approvedAt: new Date(), approvedByAdminId: adminId },
    }),
  );
}

export async function cancelMigrationPlan(tenantId: string, id: string) {
  return withTenantContext(tenantId, (tx) =>
    tx.migrationPlan.updateMany({
      where: { id, tenantId, status: "DRAFT" },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    }),
  );
}
