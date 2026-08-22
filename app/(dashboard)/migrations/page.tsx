import { Suspense } from "react";
import { ArrowRightLeft } from "lucide-react";
import { requireTenantScope } from "@/lib/auth/guard";
import { getTenantWithConnection } from "@/lib/tenant";
import { listMigrationPlans, getSelectableComparisonItems } from "@/lib/migrations";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { buttonVariants } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MigrationsHero } from "@/components/migrations/migrations-hero";
import { MigrationKpis } from "@/components/migrations/migration-kpis";
import { MigrationsLivePanel } from "@/components/migrations/migrations-live-panel";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function MigrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const admin = await requireTenantScope();
  const { tenant, connection } = await getTenantWithConnection(admin.tenantId);
  const isMember = admin.role === "TENANT_MEMBER";

  const urlSearchParams = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, Array.isArray(value) ? value[0] : value]],
    ),
  );
  const { page, pageSize, skip, take } = parsePagination(urlSearchParams);

  const { items, total, stats } = await listMigrationPlans(admin.tenantId, skip, take);
  const meta = paginationMeta(page, pageSize, total);

  const selectable = await getSelectableComparisonItems(admin.tenantId);
  const canCreate = admin.role === "TENANT_ADMIN" && Boolean(selectable && selectable.items.length > 0);
  const disabledReason = !selectable
    ? "Run a successful AWS to GCP comparison first."
    : "Latest comparison has no migratable resources (EC2, S3, RDS, or Lambda). VPCs alone cannot start a plan — create one in AWS (e.g. an S3 bucket), then re-run Audit and Comparison.";

  const emptyDescription = isMember
    ? "No migrations yet · a Tenant Admin creates plans after a successful comparison."
    : canCreate
      ? "Select resources from your latest comparison to create a migration plan."
      : disabledReason;

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

  const actions =
    admin.role === "TENANT_ADMIN" && connection?.status === "CONNECTED"
      ? canCreate
        ? newMigrationLink
        : (
            <Tooltip>
              <TooltipTrigger render={newMigrationLink} />
              <TooltipContent className="max-w-xs text-balance">{disabledReason}</TooltipContent>
            </Tooltip>
          )
      : null;

  return (
    <div className="flex flex-col gap-4">
      <MigrationsHero
        tenantName={tenant?.name ?? "your organization"}
        totalPlans={total}
        viewOnly={isMember}
        actions={actions}
      />
      {total > 0 ? <MigrationKpis stats={stats} /> : null}

      <Suspense fallback={null}>
        <MigrationsLivePanel
          initialPlans={items}
          initialMeta={meta}
          emptyTitle="No migration plans yet"
          emptyDescription={emptyDescription}
        />
      </Suspense>
    </div>
  );
}
