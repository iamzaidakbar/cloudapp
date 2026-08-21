import type { ComponentType } from "react";
import { Boxes, ShieldAlert, AlertTriangle, DollarSign } from "lucide-react";
import { StaggerItem } from "@/components/motion/stagger-list";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type AuditSummaryCardsProps = {
  resourceCount: number | null;
  findingCount: number | null;
  criticalFindingCount: number | null;
  estimatedMonthlyCost: string | number | null;
  costDataAvailable: boolean;
};

function KpiTile({
  index,
  label,
  value,
  hint,
  icon: Icon,
  emphasize,
}: {
  index: number;
  label: string;
  value: string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
  emphasize?: boolean;
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
          <p
            className={cn(
              "text-2xl font-semibold tracking-tight tabular-nums",
              emphasize ? "text-destructive" : "text-foreground",
            )}
          >
            {value}
          </p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
    </StaggerItem>
  );
}

export function AuditSummaryCards({
  resourceCount,
  findingCount,
  criticalFindingCount,
  estimatedMonthlyCost,
  costDataAvailable,
}: AuditSummaryCardsProps) {
  const costValue =
    costDataAvailable && estimatedMonthlyCost !== null
      ? formatCurrency(estimatedMonthlyCost)
      : "N/A";

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiTile
        index={0}
        label="Resources scanned"
        value={resourceCount != null ? resourceCount.toLocaleString() : "—"}
        hint="Across all services"
        icon={Boxes}
      />
      <KpiTile
        index={1}
        label="Findings"
        value={findingCount != null ? findingCount.toLocaleString() : "—"}
        hint={
          criticalFindingCount
            ? `${criticalFindingCount} critical`
            : "No critical findings"
        }
        icon={ShieldAlert}
      />
      <KpiTile
        index={2}
        label="Critical"
        value={
          criticalFindingCount != null
            ? criticalFindingCount.toLocaleString()
            : "—"
        }
        hint="Highest severity"
        icon={AlertTriangle}
        emphasize={Boolean(criticalFindingCount)}
      />
      <KpiTile
        index={3}
        label="Est. monthly cost"
        value={costValue}
        hint={costDataAvailable ? "From cost explorer sample" : "Cost data unavailable"}
        icon={DollarSign}
      />
    </div>
  );
}
