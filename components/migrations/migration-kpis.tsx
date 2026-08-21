import type { ComponentType } from "react";
import {
  ArrowRightLeft,
  FileEdit,
  ShieldCheck,
  Undo2,
} from "lucide-react";
import { StaggerItem } from "@/components/motion/stagger-list";
import { formatCurrency } from "@/lib/format";
import type { MigrationPlanStatus } from "@/lib/generated/prisma/client";

type MigrationStats = {
  total: number;
  draft: number;
  approved: number;
  cancelled: number;
  rolledBack: number;
  latest: {
    sequenceNumber: number;
    status: MigrationPlanStatus;
    resourceCount: number;
    estimatedMigrationCost: number | null;
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

export function MigrationKpis({ stats }: { stats: MigrationStats }) {
  const latest = stats.latest;

  return (
    <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiTile
        index={0}
        label="Total plans"
        value={stats.total.toLocaleString()}
        hint={`${stats.cancelled} cancelled`}
        icon={ArrowRightLeft}
      />
      <KpiTile
        index={1}
        label="Draft"
        value={String(stats.draft)}
        hint="Awaiting approval"
        icon={FileEdit}
      />
      <KpiTile
        index={2}
        label="Approved"
        value={String(stats.approved)}
        hint={`${stats.rolledBack} rolled back`}
        icon={ShieldCheck}
      />
      <KpiTile
        index={3}
        label="Latest plan"
        value={latest ? `#${latest.sequenceNumber}` : "—"}
        hint={
          latest
            ? latest.costDataAvailable && latest.estimatedMigrationCost !== null
              ? `${latest.resourceCount} resources · ${formatCurrency(latest.estimatedMigrationCost)}`
              : `${latest.resourceCount} resources · ${latest.status.toLowerCase()}`
            : "No plans yet"
        }
        icon={Undo2}
      />
    </div>
  );
}
