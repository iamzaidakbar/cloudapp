import { Suspense } from "react";
import { requireTenantScope } from "@/lib/auth/guard";
import { listJobs, JOB_TYPES, JOB_STATUSES, type JobType, type JobRowStatus } from "@/lib/jobs";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { JobsHero } from "@/components/jobs/jobs-hero";
import { JobsFilterBar } from "@/components/jobs/jobs-filter-bar";
import { JobsLivePanel } from "@/components/jobs/jobs-live-panel";

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

  return (
    <div className="flex flex-col gap-4">
      <JobsHero totalJobs={total} />
      <Suspense fallback={null}>
        <JobsFilterBar />
      </Suspense>

      <Suspense fallback={null}>
        <JobsLivePanel
          initialJobs={items}
          initialMeta={meta}
          emptyDescription={
            admin.role === "TENANT_MEMBER"
              ? "No background jobs yet · activity appears here when a Tenant Admin runs audits, comparisons, or migrations."
              : "Runs from audits, comparisons, and migrations will show up here as they happen."
          }
        />
      </Suspense>
    </div>
  );
}
