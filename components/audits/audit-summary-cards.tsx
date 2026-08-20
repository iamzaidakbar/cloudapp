import { Boxes, ShieldAlert, AlertTriangle, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

type AuditSummaryCardsProps = {
  resourceCount: number | null;
  findingCount: number | null;
  criticalFindingCount: number | null;
  estimatedMonthlyCost: string | number | null;
  costDataAvailable: boolean;
};

export function AuditSummaryCards({
  resourceCount,
  findingCount,
  criticalFindingCount,
  estimatedMonthlyCost,
  costDataAvailable,
}: AuditSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-muted-foreground">
            <Boxes className="size-4" />
            Resources Scanned
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{resourceCount ?? "—"}</p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-muted-foreground">
            <ShieldAlert className="size-4" />
            Findings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{findingCount ?? "—"}</p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-muted-foreground">
            <AlertTriangle className="size-4" />
            Critical Findings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-semibold ${criticalFindingCount ? "text-destructive" : ""}`}>
            {criticalFindingCount ?? "—"}
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-muted-foreground">
            <DollarSign className="size-4" />
            Est. Monthly Cost
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">
            {costDataAvailable && estimatedMonthlyCost !== null ? formatCurrency(estimatedMonthlyCost) : "N/A"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
