import type { ComponentType } from "react";
import {
  GitCompare,
  LoaderCircle,
  PiggyBank,
  CheckCircle2,
} from "lucide-react";
import { StaggerItem } from "@/components/motion/stagger-list";
import { formatCurrency } from "@/lib/format";

type ComparisonStats = {
  total: number;
  succeeded: number;
  failed: number;
  running: number;
  latestSucceeded: {
    version: number;
    itemCount: number | null;
    totalAwsMonthlyCost: number | null;
    totalGcpOptimizedCost: number | null;
    costDataAvailable: boolean;
  } | null;
};

function KpiTile({
  index,
  label,
  value,
  hint,
  icon: Icon,
}: {
  index: number;
  label: string;
  value: string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <StaggerItem index={index} className="h-full">
      <div className="group flex h-full flex-col justify-between border border-border bg-card p-3.5 transition-colors hover:bg-muted/40">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <Icon className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
        </div>
        <div className="mt-3 flex flex-col gap-0.5">
          <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {value}
          </p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
    </StaggerItem>
  );
}

export function ComparisonKpis({ stats }: { stats: ComparisonStats }) {
  const latest = stats.latestSucceeded;
  const savingsPercent =
    latest?.costDataAvailable &&
    latest.totalAwsMonthlyCost &&
    latest.totalGcpOptimizedCost !== null &&
    latest.totalAwsMonthlyCost > 0
      ? Math.round((1 - latest.totalGcpOptimizedCost / latest.totalAwsMonthlyCost) * 100)
      : null;

  return (
    <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiTile
        index={0}
        label="Total runs"
        value={stats.total.toLocaleString()}
        hint={`${stats.succeeded} succeeded · ${stats.failed} failed`}
        icon={GitCompare}
      />
      <KpiTile
        index={1}
        label="Active"
        value={String(stats.running)}
        hint={stats.running > 0 ? "Queued or running now" : "No active comparisons"}
        icon={LoaderCircle}
      />
      <KpiTile
        index={2}
        label="Latest items"
        value={latest?.itemCount != null ? String(latest.itemCount) : "—"}
        hint={latest ? `From comparison #${latest.version}` : "No succeeded comparison"}
        icon={CheckCircle2}
      />
      <KpiTile
        index={3}
        label="Latest savings"
        value={savingsPercent !== null ? `${savingsPercent}%` : "—"}
        hint={
          latest?.costDataAvailable && latest.totalGcpOptimizedCost !== null
            ? `GCP optimized ${formatCurrency(latest.totalGcpOptimizedCost)}`
            : "Cost data unavailable"
        }
        icon={PiggyBank}
      />
    </div>
  );
}
