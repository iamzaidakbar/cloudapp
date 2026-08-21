import Link from "next/link";
import { ArrowRight, Rocket } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { MigrationStatusBadge } from "@/components/migrations/migration-status-badge";
import { formatCurrency } from "@/lib/format";
import type { SerializedMigrationPlan } from "@/lib/migrations";

export function LatestMigrationSummary({
  migrationPlan,
}: {
  migrationPlan: SerializedMigrationPlan;
}) {
  return (
    <article className="flex h-full flex-col border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Rocket className="size-4 shrink-0" />
            <span className="text-[11px] font-medium uppercase tracking-wider">
              Latest migration
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold tracking-tight">
              Plan #{migrationPlan.sequenceNumber}
            </h3>
            <MigrationStatusBadge status={migrationPlan.status} />
          </div>
        </div>
        <Link
          href={`/migrations/${migrationPlan.id}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Open
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="grid flex-1 grid-cols-3 gap-3 p-4">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Resources
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {migrationPlan.resourceCount}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Migration cost
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {migrationPlan.costDataAvailable &&
            migrationPlan.estimatedMigrationCost !== null
              ? formatCurrency(migrationPlan.estimatedMigrationCost)
              : "N/A"}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            GCP monthly
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {migrationPlan.costDataAvailable &&
            migrationPlan.estimatedGcpMonthlyCost !== null
              ? formatCurrency(migrationPlan.estimatedGcpMonthlyCost)
              : "N/A"}
          </p>
        </div>
      </div>
    </article>
  );
}
