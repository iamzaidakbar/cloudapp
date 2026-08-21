import type { ComponentType } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  LoaderCircle,
} from "lucide-react";
import { StaggerItem } from "@/components/motion/stagger-list";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type AuditStats = {
  total: number;
  succeeded: number;
  failed: number;
  running: number;
  latestSucceeded: {
    version: number;
    resourceCount: number | null;
    findingCount: number | null;
    criticalFindingCount: number | null;
    estimatedMonthlyCost: number | null;
    costDataAvailable: boolean;
  } | null;
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

export function AuditKpis({ stats }: { stats: AuditStats }) {
  const latest = stats.latestSucceeded;

  return (
    <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiTile
        index={0}
        label="Total runs"
        value={stats.total.toLocaleString()}
        hint={`${stats.succeeded} succeeded · ${stats.failed} failed`}
        icon={ClipboardList}
      />
      <KpiTile
        index={1}
        label="Active"
        value={String(stats.running)}
        hint={stats.running > 0 ? "Queued or running now" : "No active audits"}
        icon={LoaderCircle}
      />
      <KpiTile
        index={2}
        label="Latest resources"
        value={
          latest?.resourceCount != null ? String(latest.resourceCount) : "—"
        }
        hint={latest ? `From audit #${latest.version}` : "No succeeded audit"}
        icon={CheckCircle2}
      />
      <KpiTile
        index={3}
        label="Latest findings"
        value={latest?.findingCount != null ? String(latest.findingCount) : "—"}
        hint={
          latest?.criticalFindingCount
            ? `${latest.criticalFindingCount} critical`
            : latest?.costDataAvailable && latest.estimatedMonthlyCost !== null
              ? formatCurrency(latest.estimatedMonthlyCost)
              : "No critical findings"
        }
        icon={AlertTriangle}
        emphasize={Boolean(latest?.criticalFindingCount)}
      />
    </div>
  );
}
