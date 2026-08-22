import { Prisma } from "@/lib/generated/prisma/client";
import { withTenantContext } from "@/lib/db/with-tenant";
import type { JobType, JobRowStatus, JobRow } from "@/lib/jobs-shared";

export { JOB_TYPES, JOB_STATUSES } from "@/lib/jobs-shared";
export type { JobType, JobRowStatus, JobRow } from "@/lib/jobs-shared";

type RawJobRow = Omit<JobRow, "migrationPlanSequenceNumber">;

// Six independent job-shaped models (see each model's own schema comment for
// why they were never unified into a generic Job table), unioned here purely
// for display — a real SQL UNION ALL, not an in-memory merge, so sorting,
// filtering, and pagination stay correct at the database level regardless of
// volume. VerificationRun is synchronous and has no run-level status of its
// own (see its schema comment) — normalized here as a completed 'SUCCEEDED'
// row; the real per-resource verdicts live on VerificationCheck, out of
// scope for this high-level history feed.
export async function listJobs(
  tenantId: string,
  { skip, take, type, status }: { skip: number; take: number; type?: JobType; status?: JobRowStatus },
): Promise<{ items: JobRow[]; total: number }> {
  const typeFilter = type ? Prisma.sql`AND j.type = ${type}` : Prisma.empty;
  const statusFilter = status ? Prisma.sql`AND j.status = ${status}` : Prisma.empty;

  const jobsCte = Prisma.sql`
    WITH jobs AS (
      SELECT id, 'AUDIT'::text AS type, version, status::text AS status, "queuedAt" AS "timestamp", "startedAt", "finishedAt", "errorMessage", NULL::text AS "migrationPlanId"
      FROM audit_runs WHERE "tenantId" = ${tenantId}
      UNION ALL
      SELECT id, 'COMPARISON'::text, version, status::text, "queuedAt", "startedAt", "finishedAt", "errorMessage", NULL::text
      FROM comparison_runs WHERE "tenantId" = ${tenantId}
      UNION ALL
      SELECT id, 'TERRAFORM'::text, version, status::text, "queuedAt", "startedAt", "finishedAt", "errorMessage", "migrationPlanId"
      FROM terraform_runs WHERE "tenantId" = ${tenantId}
      UNION ALL
      SELECT id, 'APPLY'::text, version, status::text, "queuedAt", "startedAt", "finishedAt", "errorMessage", "migrationPlanId"
      FROM apply_runs WHERE "tenantId" = ${tenantId}
      UNION ALL
      SELECT id, 'DATA_TRANSFER'::text, version, status::text, "queuedAt", "startedAt", "finishedAt", "errorMessage", "migrationPlanId"
      FROM transfer_runs WHERE "tenantId" = ${tenantId}
      UNION ALL
      SELECT id, 'ROLLBACK'::text, version, status::text, "queuedAt", "startedAt", "finishedAt", "errorMessage", "migrationPlanId"
      FROM rollback_runs WHERE "tenantId" = ${tenantId}
      UNION ALL
      SELECT id, 'VERIFICATION'::text, version, 'SUCCEEDED'::text, "checkedAt", "checkedAt", "checkedAt", NULL::text, "migrationPlanId"
      FROM verification_runs WHERE "tenantId" = ${tenantId}
    )
  `;

  const [rows, countRows] = await withTenantContext(tenantId, (tx) =>
    Promise.all([
      tx.$queryRaw<RawJobRow[]>`
        ${jobsCte}
        SELECT * FROM jobs j WHERE 1=1 ${typeFilter} ${statusFilter} ORDER BY j."timestamp" DESC LIMIT ${take} OFFSET ${skip}
      `,
      tx.$queryRaw<{ count: bigint }[]>`
        ${jobsCte}
        SELECT count(*)::bigint AS count FROM jobs j WHERE 1=1 ${typeFilter} ${statusFilter}
      `,
    ]),
  );

  const migrationPlanIds = [...new Set(rows.map((r) => r.migrationPlanId).filter((id): id is string => id !== null))];
  const plans = migrationPlanIds.length
    ? await withTenantContext(tenantId, (tx) =>
        tx.migrationPlan.findMany({
          where: { tenantId, id: { in: migrationPlanIds } },
          select: { id: true, sequenceNumber: true },
        }),
      )
    : [];
  const sequenceByPlanId = new Map(plans.map((p) => [p.id, p.sequenceNumber]));

  const items: JobRow[] = rows.map((row) => ({
    ...row,
    migrationPlanSequenceNumber: row.migrationPlanId ? (sequenceByPlanId.get(row.migrationPlanId) ?? null) : null,
  }));

  return { items, total: Number(countRows[0]?.count ?? 0) };
}
