import { ClipboardCheck } from "lucide-react";
import { getTenantWithConnection } from "@/lib/tenant";
import { getActiveAuditRun, listAuditRuns } from "@/lib/audits";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { RunAuditButton } from "@/components/audits/run-audit-button";
import { AuditRunsTable } from "@/components/audits/audit-runs-table";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/empty-state";

export default async function AuditsPage({
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

  const { items, total } = tenant ? await listAuditRuns(tenant.id, skip, take) : { items: [], total: 0 };
  const meta = paginationMeta(page, pageSize, total);

  const activeRun = tenant ? await getActiveAuditRun(tenant.id) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Audits</h1>
          <p className="text-sm text-muted-foreground">
            Run and review AWS infrastructure audits for {tenant?.name ?? "your organization"}.
          </p>
        </div>
        {tenant && connection?.status === "CONNECTED" ? (
          <RunAuditButton hasActiveRun={Boolean(activeRun)} activeRunStartedAt={activeRun?.startedAt} />
        ) : null}
      </div>

      <DataTableShell
        isEmpty={total === 0}
        emptyState={
          <EmptyState
            icon={ClipboardCheck}
            title="No audits yet"
            description={
              connection?.status === "CONNECTED"
                ? "Run your first audit to discover and catalog your AWS resources."
                : "Connect an AWS account before running an audit."
            }
          />
        }
        pagination={meta}
        buildPageHref={(p) => `/audits?page=${p}`}
      >
        <AuditRunsTable runs={items} />
      </DataTableShell>
    </div>
  );
}
