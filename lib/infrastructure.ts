import { withTenantContext } from "@/lib/db/with-tenant";
import { Prisma } from "@/lib/generated/prisma/client";
import { decimalToNumber } from "@/lib/decimal";
import type { AuditResource, AwsServiceType } from "@/lib/generated/prisma/client";

function serializeResource<T extends AuditResource>(resource: T) {
  return {
    ...resource,
    monthlyCost: decimalToNumber(resource.monthlyCost),
    tags: (resource.tags ?? {}) as Record<string, string>,
  };
}

export type InfrastructureFilters = {
  service?: string;
  region?: string;
  status?: string;
  environment?: string;
  tag?: string;
  q?: string;
};

export async function getLatestSucceededAuditRun(tenantId: string) {
  return withTenantContext(tenantId, (tx) =>
    tx.auditRun.findFirst({ where: { tenantId, status: "SUCCEEDED" }, orderBy: { version: "desc" } }),
  );
}

function buildResourceWhere(
  tenantId: string,
  auditRunId: string,
  filters: InfrastructureFilters,
): Prisma.AuditResourceWhereInput {
  const where: Prisma.AuditResourceWhereInput = { tenantId, auditRunId };

  if (filters.service) where.service = filters.service as AwsServiceType;
  if (filters.region) where.region = filters.region;
  if (filters.status) where.status = filters.status;
  if (filters.environment) where.environment = filters.environment;
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { resourceId: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  if (filters.tag) {
    const [key, value] = filters.tag.split(":");
    where.tags = value ? { path: [key], equals: value } : { path: [key], not: Prisma.JsonNull };
  }

  return where;
}

export async function listInfrastructureResources(
  tenantId: string,
  filters: InfrastructureFilters,
  skip: number,
  take: number,
) {
  const auditRun = await getLatestSucceededAuditRun(tenantId);
  if (!auditRun) {
    return {
      items: [],
      total: 0,
      auditRun: null,
      filterOptions: { services: [], regions: [], statuses: [] },
      inventoryStats: {
        totalResources: 0,
        serviceCount: 0,
        regionCount: 0,
        estimatedMonthlyCost: null as number | null,
        costSampleCount: 0,
        serviceBreakdown: [] as { service: AwsServiceType; count: number }[],
      },
    };
  }

  const where = buildResourceWhere(tenantId, auditRun.id, filters);

  const [items, total, allForRun] = await withTenantContext(tenantId, (tx) =>
    Promise.all([
      tx.auditResource.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
      tx.auditResource.count({ where }),
      tx.auditResource.findMany({
        where: { tenantId, auditRunId: auditRun.id },
        select: {
          service: true,
          region: true,
          status: true,
          monthlyCost: true,
          costAvailable: true,
        },
      }),
    ]),
  );

  const filterOptions = {
    services: Array.from(new Set(allForRun.map((r) => r.service))).sort(),
    regions: Array.from(new Set(allForRun.map((r) => r.region))).sort(),
    statuses: Array.from(
      new Set(allForRun.map((r) => r.status).filter((s): s is string => Boolean(s))),
    ).sort(),
  };

  const serviceCounts = new Map<AwsServiceType, number>();
  let estimatedMonthlyCost = 0;
  let costSampleCount = 0;
  for (const row of allForRun) {
    serviceCounts.set(row.service, (serviceCounts.get(row.service) ?? 0) + 1);
    if (row.costAvailable && row.monthlyCost !== null) {
      estimatedMonthlyCost += Number(row.monthlyCost);
      costSampleCount += 1;
    }
  }

  const inventoryStats = {
    totalResources: allForRun.length,
    serviceCount: serviceCounts.size,
    regionCount: filterOptions.regions.length,
    estimatedMonthlyCost: costSampleCount > 0 ? estimatedMonthlyCost : null,
    costSampleCount,
    serviceBreakdown: Array.from(serviceCounts.entries())
      .map(([service, count]) => ({ service, count }))
      .sort((a, b) => b.count - a.count),
  };

  return {
    items: items.map(serializeResource),
    total,
    auditRun,
    filterOptions,
    inventoryStats,
  };
}

export async function getInfrastructureResource(tenantId: string, id: string) {
  const resource = await withTenantContext(tenantId, (tx) =>
    tx.auditResource.findFirst({
      where: { id, tenantId },
      include: { findings: { orderBy: [{ severity: "asc" }, { createdAt: "desc" }] }, auditRun: true },
    }),
  );
  return resource ? serializeResource(resource) : null;
}
