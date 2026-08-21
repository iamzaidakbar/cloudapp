import { withTenantContext } from "@/lib/db/with-tenant";
import type { AdminActionType } from "@/lib/generated/prisma/client";

// AdminActionLog is RLS'd (see the model's own schema comment) — reads for
// a tenant-scoped viewer always go through withTenantContext, same as every
// other table. Platform Operator's own (deferred) cross-tenant log view
// would use the raw, unscoped client instead — out of scope this phase.
export async function listAdminActions({
  tenantId,
  skip,
  take,
  action,
}: {
  tenantId: string;
  skip: number;
  take: number;
  action?: AdminActionType;
}) {
  const where = { tenantId, ...(action ? { action } : {}) };
  const [rows, total] = await withTenantContext(tenantId, (tx) =>
    Promise.all([
      tx.adminActionLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
      tx.adminActionLog.count({ where }),
    ]),
  );

  // Same "Migration #N" polish as Job History's Context column — a light
  // follow-up query for just this page's referenced plans, not a join.
  const migrationPlanIds = [
    ...new Set(rows.filter((r) => r.targetType === "MigrationPlan" && r.targetId).map((r) => r.targetId as string)),
  ];
  const plans = migrationPlanIds.length
    ? await withTenantContext(tenantId, (tx) =>
        tx.migrationPlan.findMany({ where: { tenantId, id: { in: migrationPlanIds } }, select: { id: true, sequenceNumber: true } }),
      )
    : [];
  const sequenceByPlanId = new Map(plans.map((p) => [p.id, p.sequenceNumber]));

  const items = rows.map((row) => ({
    ...row,
    migrationPlanSequenceNumber:
      row.targetType === "MigrationPlan" && row.targetId ? (sequenceByPlanId.get(row.targetId) ?? null) : null,
  }));

  return { items, total };
}
