import { Boxes, Wallet, CloudCog, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

type MigrationSummaryCardsProps = {
  resourceCount: number;
  estimatedMigrationCost: number | null;
  estimatedAwsMonthlyCost: number | null;
  estimatedGcpMonthlyCost: number | null;
  costDataAvailable: boolean;
};

export function MigrationSummaryCards({
  resourceCount,
  estimatedMigrationCost,
  estimatedAwsMonthlyCost,
  estimatedGcpMonthlyCost,
  costDataAvailable,
}: MigrationSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-muted-foreground">
            <Boxes className="size-4" />
            Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{resourceCount}</p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-muted-foreground">
            <Wallet className="size-4" />
            Est. Migration Cost
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">
            {costDataAvailable && estimatedMigrationCost !== null ? formatCurrency(estimatedMigrationCost) : "N/A"}
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-muted-foreground">
            <CloudCog className="size-4" />
            Current AWS Cost
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">
            {costDataAvailable && estimatedAwsMonthlyCost !== null ? formatCurrency(estimatedAwsMonthlyCost) : "N/A"}
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-muted-foreground">
            <Sparkles className="size-4" />
            GCP Optimized Cost
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">
            {costDataAvailable && estimatedGcpMonthlyCost !== null ? formatCurrency(estimatedGcpMonthlyCost) : "N/A"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
