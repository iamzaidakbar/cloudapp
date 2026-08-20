import { CloudCog, TrendingDown, Sparkles, PiggyBank } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

type ComparisonSummaryCardsProps = {
  totalAwsMonthlyCost: number | null;
  totalGcpLikeForLikeCost: number | null;
  totalGcpOptimizedCost: number | null;
  costDataAvailable: boolean;
};

export function ComparisonSummaryCards({
  totalAwsMonthlyCost,
  totalGcpLikeForLikeCost,
  totalGcpOptimizedCost,
  costDataAvailable,
}: ComparisonSummaryCardsProps) {
  const savingsPercent =
    costDataAvailable && totalAwsMonthlyCost && totalGcpOptimizedCost !== null && totalAwsMonthlyCost > 0
      ? Math.round((1 - totalGcpOptimizedCost / totalAwsMonthlyCost) * 100)
      : null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-muted-foreground">
            <CloudCog className="size-4" />
            Current AWS Cost
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">
            {costDataAvailable && totalAwsMonthlyCost !== null ? formatCurrency(totalAwsMonthlyCost) : "N/A"}
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-muted-foreground">
            <TrendingDown className="size-4" />
            GCP Like-for-Like
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">
            {costDataAvailable && totalGcpLikeForLikeCost !== null ? formatCurrency(totalGcpLikeForLikeCost) : "N/A"}
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-muted-foreground">
            <Sparkles className="size-4" />
            GCP Optimized
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">
            {costDataAvailable && totalGcpOptimizedCost !== null ? formatCurrency(totalGcpOptimizedCost) : "N/A"}
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-muted-foreground">
            <PiggyBank className="size-4" />
            Potential Savings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-semibold ${savingsPercent && savingsPercent > 0 ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
            {savingsPercent !== null ? `${savingsPercent}%` : "N/A"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
