import { GitCompare } from "lucide-react";
import { getTenantWithConnection } from "@/lib/tenant";
import { getActiveComparisonRun, getLatestSucceededAuditRun, listComparisonRuns } from "@/lib/comparisons";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { RunComparisonButton } from "@/components/comparisons/run-comparison-button";
import { ComparisonRunsTable } from "@/components/comparisons/comparison-runs-table";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/empty-state";

export default async function ComparisonsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { tenant, connection } = await getTenantWithConnection();

  const urlSearchParams = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, Array.isArray(value) ? value[0] : value]],
    ),
  );
  const { page, pageSize, skip, take } = parsePagination(urlSearchParams);

  const { items, total } = tenant ? await listComparisonRuns(tenant.id, skip, take) : { items: [], total: 0 };
  const meta = paginationMeta(page, pageSize, total);

  const activeRun = tenant ? await getActiveComparisonRun(tenant.id) : null;
  const successfulAudit = tenant ? await getLatestSucceededAuditRun(tenant.id) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Comparisons</h1>
          <p className="text-sm text-muted-foreground">
            AWS vs GCP service mapping and cost comparison for {tenant?.name ?? "your organization"}.
          </p>
        </div>
        {tenant && connection?.status === "CONNECTED" ? (
          <RunComparisonButton
            hasActiveRun={Boolean(activeRun)}
            activeRunStartedAt={activeRun?.startedAt}
            hasSuccessfulAudit={Boolean(successfulAudit)}
          />
        ) : null}
      </div>

      <DataTableShell
        isEmpty={total === 0}
        emptyState={
          <EmptyState
            icon={GitCompare}
            title="No comparisons yet"
            description={
              successfulAudit
                ? "Run a comparison to see AWS resources mapped to their GCP equivalents with cost estimates."
                : "Run a successful audit first, then compare its resources against GCP."
            }
          />
        }
        pagination={meta}
        buildPageHref={(p) => `/comparisons?page=${p}`}
      >
        <ComparisonRunsTable runs={items} />
      </DataTableShell>
    </div>
  );
}
