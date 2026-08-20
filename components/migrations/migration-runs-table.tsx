import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MigrationStatusBadge } from "@/components/migrations/migration-status-badge";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import { formatCurrency } from "@/lib/format";
import type { MigrationPlanStatus } from "@/lib/generated/prisma/client";

export type MigrationPlanRow = {
  id: string;
  sequenceNumber: number;
  status: MigrationPlanStatus;
  resourceCount: number;
  estimatedMigrationCost: string | number | null;
  costDataAvailable: boolean;
  createdAt: string | Date;
  approvedAt: string | Date | null;
};

export function MigrationRunsTable({ plans }: { plans: MigrationPlanRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Version</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Resources</TableHead>
          <TableHead>Est. Migration Cost</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Approved</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {plans.map((plan) => (
          <TableRow key={plan.id} className="relative">
            <TableCell>
              <Link href={`/migrations/${plan.id}`} className="font-medium after:absolute after:inset-0 hover:underline">
                #{plan.sequenceNumber}
              </Link>
            </TableCell>
            <TableCell>
              <MigrationStatusBadge status={plan.status} />
            </TableCell>
            <TableCell>{plan.resourceCount}</TableCell>
            <TableCell>
              {plan.costDataAvailable && plan.estimatedMigrationCost !== null ? formatCurrency(plan.estimatedMigrationCost) : "N/A"}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              <FormattedDateTime value={plan.createdAt} />
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {plan.approvedAt ? <FormattedDateTime value={plan.approvedAt} /> : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
