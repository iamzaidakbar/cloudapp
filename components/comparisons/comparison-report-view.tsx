"use client";

import { useEffect, useRef, useState } from "react";
import { GitCompare } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuditStatusBadge } from "@/components/audits/audit-status-badge";
import { DataSourceBadge } from "@/components/aws/data-source-badge";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import { ComparisonSummaryCards } from "@/components/comparisons/comparison-summary-cards";
import { ComparisonItemsTable } from "@/components/comparisons/comparison-items-table";
import { EmptyState } from "@/components/empty-state";
import type { SerializedComparisonRun } from "@/lib/comparisons";
import type { ComparisonItemRow } from "@/components/comparisons/comparison-items-table";
import type { JobStatus } from "@/lib/generated/prisma/client";

type ComparisonRunWithItems = SerializedComparisonRun & { items: ComparisonItemRow[] };

const TERMINAL_STATUSES = new Set<JobStatus>(["SUCCEEDED", "FAILED", "CANCELLED"]);
const POLL_INTERVAL_MS = 3000;

export function ComparisonReportView({ initialComparisonRun }: { initialComparisonRun: ComparisonRunWithItems }) {
  const [comparisonRun, setComparisonRun] = useState(initialComparisonRun);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (TERMINAL_STATUSES.has(initialComparisonRun.status)) return;

    cancelledRef.current = false;

    const interval = setInterval(async () => {
      const response = await fetch(`/api/comparisons/${initialComparisonRun.id}`);
      if (!response.ok || cancelledRef.current) return;

      const body = await response.json();
      if (!body.success || cancelledRef.current) return;

      setComparisonRun(body.data.comparisonRun);
      if (TERMINAL_STATUSES.has(body.data.comparisonRun.status)) {
        clearInterval(interval);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelledRef.current = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialComparisonRun.id]);

  const isTerminal = TERMINAL_STATUSES.has(comparisonRun.status);
  const totalItems = comparisonRun.itemCount ?? 0;
  const completedItems = comparisonRun.items.length;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold text-foreground">Comparison #{comparisonRun.version}</h1>
          <AuditStatusBadge status={comparisonRun.status} />
          <DataSourceBadge dataSource={comparisonRun.awsDataSource} />
          <DataSourceBadge dataSource={comparisonRun.gcpDataSource} />
        </div>
        <p className="text-sm text-muted-foreground">
          Started {comparisonRun.startedAt ? <FormattedDateTime value={comparisonRun.startedAt} /> : "—"}
          {comparisonRun.finishedAt ? (
            <>
              {" "}
              · Completed <FormattedDateTime value={comparisonRun.finishedAt} />
            </>
          ) : null}
        </p>
      </div>

      {comparisonRun.awsDataSource === "DEV_ADAPTER" || comparisonRun.gcpDataSource === "DEV_ADAPTER" ? (
        <Alert>
          <AlertDescription>
            This comparison used simulated pricing data for {comparisonRun.awsDataSource === "DEV_ADAPTER" && comparisonRun.gcpDataSource === "DEV_ADAPTER" ? "both AWS and GCP" : comparisonRun.awsDataSource === "DEV_ADAPTER" ? "AWS" : "GCP"}, not real pricing APIs. Costs below are illustrative, not real.
          </AlertDescription>
        </Alert>
      ) : null}

      {comparisonRun.status === "FAILED" && comparisonRun.errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{comparisonRun.errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {!isTerminal ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Pricing AWS and GCP resources…</span>
            <span>
              {completedItems} / {totalItems}
            </span>
          </div>
          <Progress value={progressPercent} />
        </div>
      ) : null}

      <ComparisonSummaryCards
        totalAwsMonthlyCost={comparisonRun.totalAwsMonthlyCost}
        totalGcpLikeForLikeCost={comparisonRun.totalGcpLikeForLikeCost}
        totalGcpOptimizedCost={comparisonRun.totalGcpOptimizedCost}
        costDataAvailable={comparisonRun.costDataAvailable}
      />

      {comparisonRun.items.length > 0 ? (
        <ComparisonItemsTable items={comparisonRun.items} />
      ) : isTerminal ? (
        <EmptyState icon={GitCompare} title="No comparable resources" description="The source audit had no EC2, S3, RDS, Lambda, or VPC resources to compare." />
      ) : null}
    </div>
  );
}
