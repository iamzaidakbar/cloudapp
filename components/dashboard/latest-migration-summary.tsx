import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { MigrationStatusBadge } from "@/components/migrations/migration-status-badge";
import { formatCurrency } from "@/lib/format";
import type { SerializedMigrationPlan } from "@/lib/migrations";

export function LatestMigrationSummary({ migrationPlan }: { migrationPlan: SerializedMigrationPlan }) {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            Latest Migration — #{migrationPlan.sequenceNumber}
            <MigrationStatusBadge status={migrationPlan.status} />
          </CardTitle>
          <Link href={`/migrations/${migrationPlan.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            View plan
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Resources</p>
            <p className="text-lg font-semibold">{migrationPlan.resourceCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Est. Migration Cost</p>
            <p className="text-lg font-semibold">
              {migrationPlan.costDataAvailable && migrationPlan.estimatedMigrationCost !== null
                ? formatCurrency(migrationPlan.estimatedMigrationCost)
                : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Est. GCP Monthly Cost</p>
            <p className="text-lg font-semibold">
              {migrationPlan.costDataAvailable && migrationPlan.estimatedGcpMonthlyCost !== null
                ? formatCurrency(migrationPlan.estimatedGcpMonthlyCost)
                : "N/A"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
