import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <Table className="table-fixed">
      <TableHeader className="bg-card">
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[6rem] text-[11px] uppercase tracking-wider">
            Version
          </TableHead>
          <TableHead className="w-[8rem] text-[11px] uppercase tracking-wider">
            Status
          </TableHead>
          <TableHead className="text-[11px] uppercase tracking-wider">
            Started
          </TableHead>
          <TableHead className="text-[11px] uppercase tracking-wider">
            Completed
          </TableHead>
          <TableHead className="w-[7rem] text-[11px] uppercase tracking-wider">
            Resources
          </TableHead>
          <TableHead className="w-[7rem] text-[11px] uppercase tracking-wider">
            Findings
          </TableHead>
          <TableHead className="w-[8rem] text-[11px] uppercase tracking-wider">
            Cost
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => (
          <TableRow key={run.id} className="group relative">
            <TableCell>
              <Link
                href={`/audits/${run.id}`}
                className="font-medium after:absolute after:inset-0 group-hover:underline"
              >
                #{run.version}
              </Link>
            </TableCell>
            <TableCell>
              <AuditStatusBadge status={run.status} />
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {run.startedAt ? (
                <FormattedDateTime value={run.startedAt} />
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {run.finishedAt ? (
                <FormattedDateTime value={run.finishedAt} />
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell className="tabular-nums">
              {run.resourceCount ?? "—"}
            </TableCell>
            <TableCell className="tabular-nums">
              {run.findingCount ?? "—"}
            </TableCell>
            <TableCell className="tabular-nums">
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
