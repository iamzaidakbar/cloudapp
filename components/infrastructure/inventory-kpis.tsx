import { Boxes, DollarSign, Globe2, Layers } from "lucide-react";
import type { ComponentType } from "react";
import { StaggerItem } from "@/components/motion/stagger-list";
import { formatCurrency } from "@/lib/format";

type InventoryKpisProps = {
  totalResources: number;
  serviceCount: number;
  regionCount: number;
  estimatedMonthlyCost: number | null;
  costSampleCount: number;
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
      <div className="group flex h-full flex-col justify-between border border-border bg-card p-3.5 transition-colors hover:bg-muted/40 xl:p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <Icon className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
        </div>
        <div className="mt-3 flex flex-col gap-0.5 xl:mt-4">
          <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground xl:text-3xl">
            {value}
          </p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
    </StaggerItem>
  );
}

export function InventoryKpis({
  totalResources,
  serviceCount,
  regionCount,
  estimatedMonthlyCost,
  costSampleCount,
}: InventoryKpisProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiTile
        index={0}
        label="Resources"
        value={totalResources.toLocaleString()}
        hint="In latest succeeded audit"
        icon={Boxes}
      />
      <KpiTile
        index={1}
        label="Services"
        value={String(serviceCount)}
        hint="Distinct AWS service types"
        icon={Layers}
      />
      <KpiTile
        index={2}
        label="Regions"
        value={String(regionCount)}
        hint="Regions with inventory"
        icon={Globe2}
      />
      <KpiTile
        index={3}
        label="Est. monthly cost"
        value={
          estimatedMonthlyCost !== null
            ? formatCurrency(estimatedMonthlyCost)
            : "N/A"
        }
        hint={
          costSampleCount > 0
            ? `Across ${costSampleCount.toLocaleString()} priced resources`
            : "Cost Explorer data unavailable"
        }
        icon={DollarSign}
      />
    </div>
  );
}
