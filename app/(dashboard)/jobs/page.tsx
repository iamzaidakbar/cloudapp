import { ListChecks } from "lucide-react";
import { requireTenantScope } from "@/lib/auth/guard";
import { listJobs, JOB_TYPES, JOB_STATUSES, type JobType, type JobRowStatus } from "@/lib/jobs";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/empty-state";
import { JobsHero } from "@/components/jobs/jobs-hero";
import { JobsFilterBar } from "@/components/jobs/jobs-filter-bar";
import { JobsTable } from "@/components/jobs/jobs-table";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const admin = await requireTenantScope();

  const urlSearchParams = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, Array.isArray(value) ? value[0] : value]],
    ),
  );
  const { page, pageSize, skip, take } = parsePagination(urlSearchParams);

  const typeParam = urlSearchParams.get("type");
  const type = typeParam && (JOB_TYPES as readonly string[]).includes(typeParam) ? (typeParam as JobType) : undefined;
  const statusParam = urlSearchParams.get("status");
  const status =
    statusParam && (JOB_STATUSES as readonly string[]).includes(statusParam) ? (statusParam as JobRowStatus) : undefined;

  const { items, total } = await listJobs(admin.tenantId, { skip, take, type, status });
  const meta = paginationMeta(page, pageSize, total);

  const buildPageHref = (p: number) => {
    const next = new URLSearchParams(urlSearchParams);
    next.set("page", String(p));
    return `/jobs?${next.toString()}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <JobsHero totalJobs={total} />
      <JobsFilterBar />

      <DataTableShell
        isEmpty={total === 0}
        emptyState={
          <EmptyState
            icon={ListChecks}
            title="No jobs yet"
            description="Runs from audits, comparisons, and migrations will show up here as they happen."
          />
        }
        pagination={meta}
        buildPageHref={buildPageHref}
      >
        <JobsTable jobs={items} />
      </DataTableShell>
    </div>
  );
}
