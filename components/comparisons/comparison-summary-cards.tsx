import type { ComponentType } from "react";
import { CloudCog, TrendingDown, Sparkles, PiggyBank } from "lucide-react";
import { StaggerItem } from "@/components/motion/stagger-list";
import { formatCurrency } from "@/lib/format";

type ComparisonSummaryCardsProps = {
  totalAwsMonthlyCost: number | null;
  totalGcpLikeForLikeCost: number | null;
  totalGcpOptimizedCost: number | null;
  costDataAvailable: boolean;
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

export function ComparisonSummaryCards({
  totalAwsMonthlyCost,
  totalGcpLikeForLikeCost,
  totalGcpOptimizedCost,
  costDataAvailable,
}: ComparisonSummaryCardsProps) {
  const savingsPercent =
    costDataAvailable &&
    totalAwsMonthlyCost &&
    totalGcpOptimizedCost !== null &&
    totalAwsMonthlyCost > 0
      ? Math.round((1 - totalGcpOptimizedCost / totalAwsMonthlyCost) * 100)
      : null;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiTile
        index={0}
        label="Current AWS cost"
        value={
          costDataAvailable && totalAwsMonthlyCost !== null
            ? formatCurrency(totalAwsMonthlyCost)
            : "N/A"
        }
        hint="Monthly estimate"
        icon={CloudCog}
      />
      <KpiTile
        index={1}
        label="GCP like-for-like"
        value={
          costDataAvailable && totalGcpLikeForLikeCost !== null
            ? formatCurrency(totalGcpLikeForLikeCost)
            : "N/A"
        }
        hint="Equivalent sizing"
        icon={TrendingDown}
      />
      <KpiTile
        index={2}
        label="GCP optimized"
        value={
          costDataAvailable && totalGcpOptimizedCost !== null
            ? formatCurrency(totalGcpOptimizedCost)
            : "N/A"
        }
        hint="Right-sized target"
        icon={Sparkles}
      />
      <KpiTile
        index={3}
        label="Potential savings"
        value={savingsPercent !== null ? `${savingsPercent}%` : "N/A"}
        hint="vs current AWS spend"
        icon={PiggyBank}
      />
    </div>
  );
}
