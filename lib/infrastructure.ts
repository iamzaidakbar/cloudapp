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
    return { items: [], total: 0, auditRun: null, filterOptions: { services: [], regions: [], statuses: [] } };
  }

  const where = buildResourceWhere(tenantId, auditRun.id, filters);

  const [items, total, allForRun] = await withTenantContext(tenantId, (tx) =>
    Promise.all([
      tx.auditResource.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
      tx.auditResource.count({ where }),
      tx.auditResource.findMany({
        where: { tenantId, auditRunId: auditRun.id },
        select: { service: true, region: true, status: true },
      }),
    ]),
  );

  const filterOptions = {
    services: Array.from(new Set(allForRun.map((r) => r.service))).sort(),
    regions: Array.from(new Set(allForRun.map((r) => r.region))).sort(),
    statuses: Array.from(new Set(allForRun.map((r) => r.status).filter((s): s is string => Boolean(s)))).sort(),
  };

  return { items: items.map(serializeResource), total, auditRun, filterOptions };
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
