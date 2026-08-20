import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AuditStatusBadge } from "@/components/audits/audit-status-badge";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import { formatCurrency } from "@/lib/format";
import type { JobStatus } from "@/lib/generated/prisma/client";

export type AuditRunRow = {
  id: string;
  version: number;
  status: JobStatus;
  startedAt: string | Date | null;
  finishedAt: string | Date | null;
  resourceCount: number | null;
  findingCount: number | null;
  estimatedMonthlyCost: string | number | null;
  costDataAvailable: boolean;
};

export function AuditRunsTable({ runs }: { runs: AuditRunRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Version</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Started</TableHead>
          <TableHead>Completed</TableHead>
          <TableHead>Resources</TableHead>
          <TableHead>Findings</TableHead>
          <TableHead>Cost</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => (
          <TableRow key={run.id} className="relative">
            <TableCell>
              <Link href={`/audits/${run.id}`} className="font-medium after:absolute after:inset-0 hover:underline">
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
            <TableCell>{run.resourceCount ?? "—"}</TableCell>
            <TableCell>{run.findingCount ?? "—"}</TableCell>
            <TableCell>
              {run.costDataAvailable && run.estimatedMonthlyCost !== null
                ? formatCurrency(run.estimatedMonthlyCost)
                : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
