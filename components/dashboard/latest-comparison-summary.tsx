import Link from "next/link";
import { ArrowRight, GitCompare } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { AuditStatusBadge } from "@/components/audits/audit-status-badge";
import { formatCurrency } from "@/lib/format";
import type { SerializedComparisonRun } from "@/lib/comparisons";

export function LatestComparisonSummary({
  comparisonRun,
}: {
  comparisonRun: SerializedComparisonRun;
}) {
  const savingsPercent =
    comparisonRun.costDataAvailable &&
    comparisonRun.totalAwsMonthlyCost &&
    comparisonRun.totalGcpOptimizedCost !== null &&
    comparisonRun.totalAwsMonthlyCost > 0
      ? Math.round(
          (1 -
            comparisonRun.totalGcpOptimizedCost /
              comparisonRun.totalAwsMonthlyCost) *
            100,
        )
      : null;

  return (
    <article className="flex h-full flex-col border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <GitCompare className="size-4 shrink-0" />
            <span className="text-[11px] font-medium uppercase tracking-wider">
              Latest comparison
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold tracking-tight">
              Run #{comparisonRun.version}
            </h3>
            <AuditStatusBadge status={comparisonRun.status} />
          </div>
        </div>
        <Link
          href={`/comparisons/${comparisonRun.id}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Open
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              AWS monthly
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {comparisonRun.costDataAvailable &&
              comparisonRun.totalAwsMonthlyCost !== null
                ? formatCurrency(comparisonRun.totalAwsMonthlyCost)
                : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              GCP like-for-like
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {comparisonRun.costDataAvailable &&
              comparisonRun.totalGcpLikeForLikeCost !== null
                ? formatCurrency(comparisonRun.totalGcpLikeForLikeCost)
                : "N/A"}
            </p>
          </div>
        </div>

        <div className="border border-border bg-muted/40 p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Potential savings
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
            {savingsPercent !== null ? `${savingsPercent}%` : "N/A"}
          </p>
        </div>
      </div>
    </article>
  );
}
