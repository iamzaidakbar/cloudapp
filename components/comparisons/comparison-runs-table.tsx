import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AuditStatusBadge } from "@/components/audits/audit-status-badge";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import { formatCurrency } from "@/lib/format";
import type { JobStatus } from "@/lib/generated/prisma/client";

export type ComparisonRunRow = {
  id: string;
  version: number;
  status: JobStatus;
  startedAt: string | Date | null;
  finishedAt: string | Date | null;
  itemCount: number | null;
  totalAwsMonthlyCost: string | number | null;
  totalGcpLikeForLikeCost: string | number | null;
  costDataAvailable: boolean;
};

export function ComparisonRunsTable({ runs }: { runs: ComparisonRunRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Version</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Started</TableHead>
          <TableHead>Completed</TableHead>
          <TableHead>Resources</TableHead>
          <TableHead>AWS Cost</TableHead>
          <TableHead>GCP Cost</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => (
          <TableRow key={run.id} className="relative">
            <TableCell>
              <Link href={`/comparisons/${run.id}`} className="font-medium after:absolute after:inset-0 hover:underline">
                #{run.version}
              </Link>
            </TableCell>
            <TableCell>
              <AuditStatusBadge status={run.status} />
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {run.startedAt ? <FormattedDateTime value={run.startedAt} /> : "—"}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {run.finishedAt ? <FormattedDateTime value={run.finishedAt} /> : "—"}
            </TableCell>
            <TableCell>{run.itemCount ?? "—"}</TableCell>
            <TableCell>
              {run.costDataAvailable && run.totalAwsMonthlyCost !== null ? formatCurrency(run.totalAwsMonthlyCost) : "—"}
            </TableCell>
            <TableCell>
              {run.costDataAvailable && run.totalGcpLikeForLikeCost !== null
                ? formatCurrency(run.totalGcpLikeForLikeCost)
                : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
