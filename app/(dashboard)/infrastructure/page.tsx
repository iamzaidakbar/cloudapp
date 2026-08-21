import { Server } from "lucide-react";
import { requireTenantScope } from "@/lib/auth/guard";
import { listInfrastructureResources } from "@/lib/infrastructure";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { InfrastructureFilterBar } from "@/components/infrastructure/infrastructure-filter-bar";
import { InfrastructureTable } from "@/components/infrastructure/infrastructure-table";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/empty-state";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

export default async function InfrastructurePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const get = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const admin = await requireTenantScope();

  const urlSearchParams = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, Array.isArray(value) ? value[0] : value]],
    ),
  );
  const { page, pageSize, skip, take } = parsePagination(urlSearchParams);

  const filters = {
    service: get("service"),
    region: get("region"),
    status: get("status"),
    environment: get("environment"),
    tag: get("tag"),
    q: get("q"),
  };

  const { items, total, auditRun, filterOptions } = await listInfrastructureResources(admin.tenantId, filters, skip, take);

  const meta = paginationMeta(page, pageSize, total);
  const hasActiveFilters = Object.entries(params).some(([key, value]) => key !== "page" && Boolean(value));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Infrastructure"
        description={
          auditRun ? `From audit run #${auditRun.version}` : "AWS resources discovered by your audits."
        }
      />

      {auditRun ? <InfrastructureFilterBar filterOptions={filterOptions} /> : null}

      <DataTableShell
        isEmpty={total === 0}
        emptyState={
          hasActiveFilters ? (
            <div className="flex flex-col items-center gap-2 rounded-none border border-dashed px-6 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No resources match the current filters.</p>
              <Link href="/infrastructure" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Clear filters
              </Link>
            </div>
          ) : (
            <EmptyState
              icon={Server}
              title="No infrastructure data yet"
              description="Run your first audit to discover and catalog your AWS resources here."
            >
              <Link href="/audits" className={`${buttonVariants({ variant: "default" })} mt-2`}>
                Go to Audits
              </Link>
            </EmptyState>
          )
        }
        pagination={meta}
        buildPageHref={(p) => {
          const next = new URLSearchParams(urlSearchParams);
          next.set("page", String(p));
          return `/infrastructure?${next.toString()}`;
        }}
      >
        <InfrastructureTable items={items} dataSource={auditRun?.dataSource ?? null} />
      </DataTableShell>
    </div>
  );
}
