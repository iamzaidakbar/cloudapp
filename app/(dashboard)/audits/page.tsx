import { ClipboardCheck } from "lucide-react";
import { requireTenantScope } from "@/lib/auth/guard";
import { getTenantWithConnection } from "@/lib/tenant";
import { getActiveAuditRun, listAuditRuns } from "@/lib/audits";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { RunAuditButton } from "@/components/audits/run-audit-button";
import { AuditRunsTable } from "@/components/audits/audit-runs-table";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/empty-state";

export default async function AuditsPage({
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

  const { items, total } = await listAuditRuns(admin.tenantId, skip, take);
  const meta = paginationMeta(page, pageSize, total);

  const activeRun = await getActiveAuditRun(admin.tenantId);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Audits"
        description={`Run and review AWS infrastructure audits for ${tenant?.name ?? "your organization"}.`}
        actions={
          admin.role === "TENANT_ADMIN" && connection?.status === "CONNECTED" ? (
            <RunAuditButton hasActiveRun={Boolean(activeRun)} activeRunStartedAt={activeRun?.startedAt} />
          ) : null
        }
      />

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
