import { ArrowRightLeft } from "lucide-react";
import { getTenantWithConnection } from "@/lib/tenant";
import { listMigrationPlans, getSelectableComparisonItems } from "@/lib/migrations";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { buttonVariants } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MigrationRunsTable } from "@/components/migrations/migration-runs-table";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/empty-state";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function MigrationsPage({
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

  const { items, total } = tenant ? await listMigrationPlans(tenant.id, skip, take) : { items: [], total: 0 };
  const meta = paginationMeta(page, pageSize, total);

  const selectable = tenant ? await getSelectableComparisonItems(tenant.id) : null;
  const canCreate = Boolean(selectable && selectable.items.length > 0);

  const newMigrationLink = (
    <Link
      href="/migrations/new"
      aria-disabled={!canCreate}
      className={cn(buttonVariants({ variant: "default" }), !canCreate && "pointer-events-none opacity-50")}
    >
      <ArrowRightLeft className="size-4" />
      New Migration
    </Link>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Migrations</h1>
          <p className="text-sm text-muted-foreground">
            Plan and approve AWS to GCP migrations for {tenant?.name ?? "your organization"}.
          </p>
        </div>
        {tenant && connection?.status === "CONNECTED" ? (
          canCreate ? (
            newMigrationLink
          ) : (
            <Tooltip>
              <TooltipTrigger render={newMigrationLink} />
              <TooltipContent>Run a successful AWS to GCP comparison first</TooltipContent>
            </Tooltip>
          )
        ) : null}
      </div>

      <DataTableShell
        isEmpty={total === 0}
        emptyState={
          <EmptyState
            icon={ArrowRightLeft}
            title="No migration plans yet"
            description={
              canCreate
                ? "Select resources from your latest comparison to create a migration plan."
                : "Run a successful AWS to GCP comparison first, then create a migration plan."
            }
          />
        }
        pagination={meta}
        buildPageHref={(p) => `/migrations?page=${p}`}
      >
        <MigrationRunsTable plans={items} />
      </DataTableShell>
    </div>
  );
}
