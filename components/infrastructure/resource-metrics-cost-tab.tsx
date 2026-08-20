import { DollarSign, Cpu } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

type ResourceMetricsCostTabProps = {
  monthlyCost: string | number | null;
  costAvailable: boolean;
  cpuUtilizationAvgPercent: number | null;
};

export function ResourceMetricsCostTab({
  monthlyCost,
  costAvailable,
  cpuUtilizationAvgPercent,
}: ResourceMetricsCostTabProps) {
  return (
    <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2">
      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-muted-foreground">
            <DollarSign className="size-4" />
            Estimated Monthly Cost
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">
            {costAvailable && monthlyCost !== null ? formatCurrency(monthlyCost) : "Unavailable"}
          </p>
          {!costAvailable ? (
            <p className="text-xs text-muted-foreground">
              Per-resource cost requires Cost Explorer with resource-level granularity.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-muted-foreground">
            <Cpu className="size-4" />
            Avg CPU Utilization (14d)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">
            {cpuUtilizationAvgPercent !== null ? `${cpuUtilizationAvgPercent.toFixed(1)}%` : "N/A"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
