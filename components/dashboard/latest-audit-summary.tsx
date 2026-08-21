import Link from "next/link";
import { ArrowRight, ListChecks } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { AuditStatusBadge } from "@/components/audits/audit-status-badge";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import { formatCurrency } from "@/lib/format";
import type { SerializedAuditRun } from "@/lib/audits";
import { cn } from "@/lib/utils";

function Metric({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="border border-border bg-background/60 p-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-xl font-semibold tabular-nums tracking-tight",
          danger && "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function LatestAuditSummary({
  auditRun,
}: {
  auditRun: SerializedAuditRun;
}) {
  return (
    <article className="flex h-full flex-col border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ListChecks className="size-4 shrink-0" />
            <span className="text-[11px] font-medium uppercase tracking-wider">
              Latest audit
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold tracking-tight">
              Run #{auditRun.version}
            </h3>
            <AuditStatusBadge status={auditRun.status} />
          </div>
        </div>
        <Link
          href={`/audits/${auditRun.id}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Open
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="grid flex-1 grid-cols-2 gap-2 p-4">
        <Metric
          label="Resources"
          value={
            auditRun.resourceCount != null ? String(auditRun.resourceCount) : "—"
          }
        />
        <Metric
          label="Findings"
          value={
            auditRun.findingCount != null ? String(auditRun.findingCount) : "—"
          }
        />
        <Metric
          label="Critical"
          value={
            auditRun.criticalFindingCount != null
              ? String(auditRun.criticalFindingCount)
              : "—"
          }
          danger={Boolean(auditRun.criticalFindingCount)}
        />
        <Metric
          label="Est. cost"
          value={
            auditRun.costDataAvailable && auditRun.estimatedMonthlyCost !== null
              ? formatCurrency(auditRun.estimatedMonthlyCost)
              : "N/A"
          }
        />
      </div>

      {auditRun.finishedAt ? (
        <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
          Completed <FormattedDateTime value={auditRun.finishedAt} />
        </p>
      ) : null}
    </article>
  );
}
