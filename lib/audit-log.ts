import { prisma } from "@/lib/db";
import type { AdminActionType } from "@/lib/generated/prisma/client";

// AdminActionLog is not tenant-scoped / not covered by RLS (see the model's
// own schema comment) — reads via the raw `prisma` client, same as
// lib/pricing/cache.ts. No tenant filter is applied: this deployment only
// ever has one tenant, so showing every row is both simpler and correct.
export async function listAdminActions({
  skip,
  take,
  action,
}: {
  skip: number;
  take: number;
  action?: AdminActionType;
}) {
  const where = action ? { action } : {};
  const [rows, total] = await Promise.all([
    prisma.adminActionLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    prisma.adminActionLog.count({ where }),
  ]);

  // Same "Migration #N" polish as Job History's Context column — a light
  // follow-up query for just this page's referenced plans, not a join.
  const migrationPlanIds = [
    ...new Set(rows.filter((r) => r.targetType === "MigrationPlan" && r.targetId).map((r) => r.targetId as string)),
  ];
  const plans = migrationPlanIds.length
    ? await prisma.migrationPlan.findMany({ where: { id: { in: migrationPlanIds } }, select: { id: true, sequenceNumber: true } })
    : [];
  const sequenceByPlanId = new Map(plans.map((p) => [p.id, p.sequenceNumber]));

  const items = rows.map((row) => ({
    ...row,
    migrationPlanSequenceNumber:
      row.targetType === "MigrationPlan" && row.targetId ? (sequenceByPlanId.get(row.targetId) ?? null) : null,
  }));

  return { items, total };
}
