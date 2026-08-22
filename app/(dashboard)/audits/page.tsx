import { ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { requireTenantScope } from "@/lib/auth/guard";
import { getTenantWithConnection } from "@/lib/tenant";
import { getActiveAuditRun, listAuditRuns } from "@/lib/audits";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { AuditsHero } from "@/components/audits/audits-hero";
import { AuditKpis } from "@/components/audits/audit-kpis";
import { AuditRunsTable } from "@/components/audits/audit-runs-table";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      value === undefined
        ? []
        : [[key, Array.isArray(value) ? value[0] : value]],
    ),
  );
  const { page, pageSize, skip, take } = parsePagination(urlSearchParams);

  const { items, total, stats } = await listAuditRuns(
    admin.tenantId,
    skip,
    take,
  );
  const meta = paginationMeta(page, pageSize, total);
  const activeRun = await getActiveAuditRun(admin.tenantId);

  const canRun =
    admin.role === "TENANT_ADMIN" && connection?.status === "CONNECTED";
  const connected = connection?.status === "CONNECTED";
  const viewOnly = admin.role === "TENANT_MEMBER";

  return (
    <div className="flex flex-col gap-4">
      <AuditsHero
        tenantName={tenant?.name ?? "your organization"}
        canRun={canRun}
        viewOnly={viewOnly}
        hasActiveRun={Boolean(activeRun)}
        activeRunStartedAt={activeRun?.startedAt}
        totalRuns={total}
      />
      {total > 0 ? <AuditKpis stats={stats} /> : null}

      <DataTableShell
        isEmpty={total === 0}
        emptyState={
          <EmptyState
            icon={ClipboardCheck}
            title="No audits yet"
            description={
              viewOnly
                ? connected
                  ? "No audit runs yet · a Tenant Admin starts the first discovery audit."
                  : "AWS is not connected · ask a Tenant Admin to finish setup."
                : connected
                  ? "Run your first audit to discover and catalog your AWS resources."
                  : "Connect an AWS account before running an audit."
            }
          >
            {!connected && !viewOnly ? (
              <Link
                href="/onboarding"
                className={cn(
                  buttonVariants({ variant: "default", size: "sm" }),
                  "mt-1",
                )}
              >
                Connect AWS
              </Link>
            ) : null}
          </EmptyState>
        }
        pagination={meta}
        buildPageHref={(p) => `/audits?page=${p}`}
      >
        <AuditRunsTable runs={items} />
      </DataTableShell>
    </div>
  );
}
