import type { ComponentType } from "react";
import {
  AlertTriangle,
  Boxes,
  DollarSign,
  Percent,
} from "lucide-react";
import { StaggerItem } from "@/components/motion/stagger-list";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SerializedAuditRun } from "@/lib/audits";
import type { SerializedComparisonRun } from "@/lib/comparisons";

type DashboardKpisProps = {
  connected: boolean;
  auditRun: SerializedAuditRun | null;
  comparisonRun: SerializedComparisonRun | null;
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
      <div className="group flex h-full flex-col justify-between border border-border bg-card p-4 transition-colors hover:bg-muted/40">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <Icon className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
        </div>
        <div className="mt-4 flex flex-col gap-1">
          <p
            className={cn(
              "font-semibold tracking-tight tabular-nums",
              emphasize ? "text-destructive text-3xl" : "text-3xl text-foreground",
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

export function DashboardKpis({
  connected,
  auditRun,
  comparisonRun,
}: DashboardKpisProps) {
  if (!connected) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {["Resources", "Findings", "Monthly cost", "GCP savings"].map(
          (label, index) => (
            <KpiTile
              key={label}
              index={index}
              label={label}
              value="—"
              hint="Connect AWS to populate"
              icon={Boxes}
            />
          ),
        )}
      </div>
    );
  }

  const savingsPercent =
    comparisonRun?.costDataAvailable &&
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

  const costValue =
    auditRun?.costDataAvailable && auditRun.estimatedMonthlyCost !== null
      ? formatCurrency(auditRun.estimatedMonthlyCost)
      : "N/A";

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiTile
        index={0}
        label="Resources"
        value={auditRun?.resourceCount != null ? String(auditRun.resourceCount) : "—"}
        hint="From latest audit"
        icon={Boxes}
      />
      <KpiTile
        index={1}
        label="Findings"
        value={auditRun?.findingCount != null ? String(auditRun.findingCount) : "—"}
        hint={
          auditRun?.criticalFindingCount
            ? `${auditRun.criticalFindingCount} critical`
            : "No critical findings"
        }
        icon={AlertTriangle}
        emphasize={Boolean(auditRun?.criticalFindingCount)}
      />
      <KpiTile
        index={2}
        label="Est. monthly cost"
        value={costValue}
        hint="AWS estimated spend"
        icon={DollarSign}
      />
      <KpiTile
        index={3}
        label="Potential savings"
        value={savingsPercent !== null ? `${savingsPercent}%` : "—"}
        hint="AWS → GCP optimized"
        icon={Percent}
      />
    </div>
  );
}
