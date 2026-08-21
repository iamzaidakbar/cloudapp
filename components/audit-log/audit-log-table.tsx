import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionBadge } from "@/components/audit-log/action-badge";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import { StaggerItem } from "@/components/motion/stagger-list";
import type { AdminActionTypeValue } from "@/lib/audit-log-shared";

export type AuditLogRow = {
  id: string;
  createdAt: string | Date;
  adminEmail: string;
  action: AdminActionTypeValue;
  targetType: string | null;
  targetId: string | null;
  detail: unknown;
  migrationPlanSequenceNumber: number | null;
};

function targetLink(row: AuditLogRow): { href: string; label: string } | null {
  if (!row.targetId) return null;
  switch (row.targetType) {
    case "MigrationPlan":
      return { href: `/migrations/${row.targetId}`, label: `Migration #${row.migrationPlanSequenceNumber ?? "?"}` };
    case "AuditRun":
      return { href: `/audits/${row.targetId}`, label: "Audit" };
    case "ComparisonRun":
      return { href: `/comparisons/${row.targetId}`, label: "Comparison" };
    case "AwsConnection":
      return { href: "/settings/aws", label: "AWS Connection" };
    default:
      return null;
  }
}

export function AuditLogTable({ rows }: { rows: AuditLogRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Admin</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Target</TableHead>
          <TableHead>Detail</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => {
          const link = targetLink(row);
          return (
            <TableRow key={row.id}>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                <StaggerItem index={index}>
                  <FormattedDateTime value={row.createdAt} />
                </StaggerItem>
              </TableCell>
              <TableCell className="font-mono text-xs">
                <StaggerItem index={index}>{row.adminEmail}</StaggerItem>
              </TableCell>
              <TableCell>
                <StaggerItem index={index}>
                  <ActionBadge action={row.action} />
                </StaggerItem>
              </TableCell>
              <TableCell className="text-xs">
                <StaggerItem index={index}>
                  {link ? (
                    <Link href={link.href} className="text-muted-foreground hover:underline">
                      {link.label}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </StaggerItem>
              </TableCell>
              <TableCell className="max-w-64 truncate text-xs text-muted-foreground" title={row.detail ? JSON.stringify(row.detail) : undefined}>
                <StaggerItem index={index}>{row.detail ? JSON.stringify(row.detail) : "—"}</StaggerItem>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
