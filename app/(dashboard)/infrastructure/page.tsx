import { Server } from "lucide-react";
import Link from "next/link";
import { requireTenantScope } from "@/lib/auth/guard";
import { listInfrastructureResources } from "@/lib/infrastructure";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { InfrastructureHero } from "@/components/infrastructure/infrastructure-hero";
import { InventoryKpis } from "@/components/infrastructure/inventory-kpis";
import { ServiceBreakdown } from "@/components/infrastructure/service-breakdown";
import { InfrastructureFilterBar } from "@/components/infrastructure/infrastructure-filter-bar";
import { InfrastructureTable } from "@/components/infrastructure/infrastructure-table";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      value === undefined
        ? []
        : [[key, Array.isArray(value) ? value[0] : value]],
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

  const { items, total, auditRun, filterOptions, inventoryStats } =
    await listInfrastructureResources(admin.tenantId, filters, skip, take);

  const meta = paginationMeta(page, pageSize, total);
  const hasActiveFilters = Object.entries(params).some(
    ([key, value]) => key !== "page" && Boolean(value),
  );

  return (
    <div className="flex flex-col gap-4">
      <InfrastructureHero
        hasInventory={Boolean(auditRun)}
        auditVersion={auditRun?.version}
        dataSource={auditRun?.dataSource}
        collectedAt={auditRun?.finishedAt ?? auditRun?.createdAt}
        matchingCount={total}
        totalResources={inventoryStats.totalResources}
        hasActiveFilters={hasActiveFilters}
      />

      {auditRun ? (
        <>
          <InventoryKpis
            totalResources={inventoryStats.totalResources}
            serviceCount={inventoryStats.serviceCount}
            regionCount={inventoryStats.regionCount}
            estimatedMonthlyCost={inventoryStats.estimatedMonthlyCost}
            costSampleCount={inventoryStats.costSampleCount}
          />
          <ServiceBreakdown
            breakdown={inventoryStats.serviceBreakdown}
            activeService={filters.service}
            totalResources={inventoryStats.totalResources}
          />
          <InfrastructureFilterBar filterOptions={filterOptions} />

          <DataTableShell
            isEmpty={total === 0}
            emptyState={
              hasActiveFilters ? (
                <EmptyState
                  icon={Server}
                  title="No resources match"
                  description="Try clearing filters or adjusting your search."
                >
                  <Link
                    href="/infrastructure"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "mt-1",
                    )}
                  >
                    Clear filters
                  </Link>
                </EmptyState>
              ) : (
                <EmptyState
                  icon={Server}
                  title="No resources in this audit"
                  description="The latest succeeded audit returned an empty inventory."
                />
              )
            }
            pagination={meta}
            buildPageHref={(p) => {
              const next = new URLSearchParams(urlSearchParams);
              next.set("page", String(p));
              return `/infrastructure?${next.toString()}`;
            }}
          >
            <InfrastructureTable
              items={items}
              dataSource={auditRun.dataSource ?? null}
            />
          </DataTableShell>
        </>
      ) : (
        <EmptyState
          icon={Server}
          title="No infrastructure data yet"
          description="Run your first audit to discover and catalog your AWS resources here."
        >
          <Link
            href="/audits"
            className={cn(buttonVariants({ variant: "default", size: "sm" }), "mt-1")}
          >
            Go to Audits
          </Link>
        </EmptyState>
      )}
    </div>
  );
}
