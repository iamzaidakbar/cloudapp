import { DollarSign, Cpu } from "lucide-react";
import { formatCurrency } from "@/lib/format";

type ResourceMetricsCostTabProps = {
  monthlyCost: string | number | null;
  costAvailable: boolean;
  cpuUtilizationAvgPercent: number | null;
};

export function ResourceMetricsCostTab({
  monthlyCost,
  costAvailable,
  cpuUtilizationAvgPercent,
}: ResourceMetricsCostTabProps) {
  const cpu =
    cpuUtilizationAvgPercent !== null
      ? Math.min(100, Math.max(0, cpuUtilizationAvgPercent))
      : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">
          Metrics & cost
        </h2>
        <p className="text-xs text-muted-foreground">
          Estimated spend and utilization signals from the audit snapshot
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col justify-between border border-border bg-background/50 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Estimated monthly cost
            </p>
            <DollarSign className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">
            {costAvailable && monthlyCost !== null
              ? formatCurrency(monthlyCost)
              : "Unavailable"}
          </p>
          {!costAvailable ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Per-resource cost requires Cost Explorer with resource-level
              granularity.
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              From Cost Explorer at collection time
            </p>
          )}
        </div>

        <div className="flex flex-col justify-between border border-border bg-background/50 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Avg CPU utilization (14d)
            </p>
            <Cpu className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">
            {cpu !== null ? `${cpu.toFixed(1)}%` : "N/A"}
          </p>
          {cpu !== null ? (
            <div className="mt-3 h-1.5 w-full bg-muted">
              <div
                className="h-full bg-foreground transition-[width]"
                style={{ width: `${cpu}%` }}
              />
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              No CloudWatch CPU series for this resource type
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
