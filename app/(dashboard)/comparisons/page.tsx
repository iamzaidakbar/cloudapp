import { GitCompare } from "lucide-react";
import { requireTenantScope } from "@/lib/auth/guard";
import { getTenantWithConnection } from "@/lib/tenant";
import {
  getActiveComparisonRun,
  getLatestSucceededAuditRun,
  listComparisonRuns,
} from "@/lib/comparisons";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { ComparisonsHero } from "@/components/comparisons/comparisons-hero";
import { ComparisonKpis } from "@/components/comparisons/comparison-kpis";
import { ComparisonRunsTable } from "@/components/comparisons/comparison-runs-table";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/empty-state";

export default async function ComparisonsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const admin = await requireTenantScope();
  const { tenant, connection } = await getTenantWithConnection(admin.tenantId);

  const urlSearchParams = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, Array.isArray(value) ? value[0] : value]],
    ),
  );
  const { page, pageSize, skip, take } = parsePagination(urlSearchParams);

  const { items, total, stats } = await listComparisonRuns(admin.tenantId, skip, take);
  const meta = paginationMeta(page, pageSize, total);

  const activeRun = await getActiveComparisonRun(admin.tenantId);
  const successfulAudit = await getLatestSucceededAuditRun(admin.tenantId);
  const canRun =
    admin.role === "TENANT_ADMIN" && connection?.status === "CONNECTED";

  return (
    <div className="flex flex-col gap-4">
      <ComparisonsHero
        tenantName={tenant?.name ?? "your organization"}
        canRun={canRun}
        viewOnly={admin.role === "TENANT_MEMBER"}
        hasActiveRun={Boolean(activeRun)}
        activeRunStartedAt={activeRun?.startedAt}
        hasSuccessfulAudit={Boolean(successfulAudit)}
        totalRuns={total}
      />
      {total > 0 ? <ComparisonKpis stats={stats} /> : null}

      <DataTableShell
        isEmpty={total === 0}
        emptyState={
          <EmptyState
            icon={GitCompare}
            title="No comparisons yet"
            description={
              admin.role === "TENANT_MEMBER"
                ? successfulAudit
                  ? "No comparisons yet · a Tenant Admin runs cost mapping after an audit."
                  : "Waiting on a successful audit · a Tenant Admin runs discovery first."
                : successfulAudit
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
