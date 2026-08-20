import { withTenantContext } from "@/lib/db/with-tenant";
import { ALL_SERVICE_TYPES } from "@/lib/aws/audit/types";
import { decimalToNumber } from "@/lib/decimal";
import type { AuditRun, FindingSeverity, FindingType } from "@/lib/generated/prisma/client";

function serializeAuditRun<T extends AuditRun>(run: T) {
  return { ...run, estimatedMonthlyCost: decimalToNumber(run.estimatedMonthlyCost) };
}

export type SerializedAuditRun = ReturnType<typeof serializeAuditRun<AuditRun>>;

export async function getNextAuditVersion(tenantId: string): Promise<number> {
  const latest = await withTenantContext(tenantId, (tx) =>
    tx.auditRun.findFirst({ where: { tenantId }, orderBy: { version: "desc" }, select: { version: true } }),
  );
  return (latest?.version ?? 0) + 1;
}

export async function getActiveAuditRun(tenantId: string) {
  return withTenantContext(tenantId, (tx) =>
    tx.auditRun.findFirst({
      where: { tenantId, status: { in: ["QUEUED", "RUNNING"] } },
      orderBy: { version: "desc" },
    }),
  );
}

export async function createAuditRun(tenantId: string, dataSource: "AWS" | "DEV_ADAPTER") {
  const version = await getNextAuditVersion(tenantId);

  return withTenantContext(tenantId, async (tx) => {
    const auditRun = await tx.auditRun.create({
      data: { tenantId, version, status: "QUEUED", dataSource },
    });
    await tx.auditServiceStatus.createMany({
      data: ALL_SERVICE_TYPES.map((service) => ({ tenantId, auditRunId: auditRun.id, service })),
    });
    return auditRun;
  });
}

export async function listAuditRuns(tenantId: string, skip: number, take: number) {
  const [items, total] = await withTenantContext(tenantId, (tx) =>
    Promise.all([
      tx.auditRun.findMany({ where: { tenantId }, orderBy: { version: "desc" }, skip, take }),
      tx.auditRun.count({ where: { tenantId } }),
    ]),
  );
  return { items: items.map(serializeAuditRun), total };
}

export async function getAuditRun(tenantId: string, id: string) {
  const run = await withTenantContext(tenantId, (tx) =>
    tx.auditRun.findFirst({
      where: { id, tenantId },
      include: { serviceStatuses: { orderBy: { service: "asc" } } },
    }),
  );
  return run ? serializeAuditRun(run) : null;
}

export async function listAuditFindings(
  tenantId: string,
  auditRunId: string,
  filters: { severity?: FindingSeverity[]; type?: FindingType[] },
  skip: number,
  take: number,
) {
  const where = {
    tenantId,
    auditRunId,
    ...(filters.severity?.length ? { severity: { in: filters.severity } } : {}),
    ...(filters.type?.length ? { type: { in: filters.type } } : {}),
  };

  const [items, total] = await withTenantContext(tenantId, (tx) =>
    Promise.all([
      tx.auditFinding.findMany({
        where,
        orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
        skip,
        take,
        include: { resource: { select: { id: true, service: true, name: true, resourceId: true } } },
      }),
      tx.auditFinding.count({ where }),
    ]),
  );
  return { items, total };
}
