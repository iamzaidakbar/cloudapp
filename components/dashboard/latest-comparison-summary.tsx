import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { AuditStatusBadge } from "@/components/audits/audit-status-badge";
import { formatCurrency } from "@/lib/format";
import type { SerializedComparisonRun } from "@/lib/comparisons";

export function LatestComparisonSummary({ comparisonRun }: { comparisonRun: SerializedComparisonRun }) {
  const savingsPercent =
    comparisonRun.costDataAvailable &&
    comparisonRun.totalAwsMonthlyCost &&
    comparisonRun.totalGcpOptimizedCost !== null &&
    comparisonRun.totalAwsMonthlyCost > 0
      ? Math.round((1 - comparisonRun.totalGcpOptimizedCost / comparisonRun.totalAwsMonthlyCost) * 100)
      : null;

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            Latest Comparison — #{comparisonRun.version}
            <AuditStatusBadge status={comparisonRun.status} />
          </CardTitle>
          <Link href={`/comparisons/${comparisonRun.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            View report
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Est. AWS Monthly Cost</p>
            <p className="text-lg font-semibold">
              {comparisonRun.costDataAvailable && comparisonRun.totalAwsMonthlyCost !== null
                ? formatCurrency(comparisonRun.totalAwsMonthlyCost)
                : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Est. GCP Monthly Cost</p>
            <p className="text-lg font-semibold">
              {comparisonRun.costDataAvailable && comparisonRun.totalGcpLikeForLikeCost !== null
                ? formatCurrency(comparisonRun.totalGcpLikeForLikeCost)
                : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Potential Savings</p>
            <p className={`text-lg font-semibold ${savingsPercent && savingsPercent > 0 ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
              {savingsPercent !== null ? `${savingsPercent}%` : "N/A"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
