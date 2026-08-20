import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SeverityBadge } from "@/components/findings/severity-badge";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import type { FindingSeverity, FindingType } from "@/lib/generated/prisma/client";

export type FindingRow = {
  id: string;
  type: FindingType;
  severity: FindingSeverity;
  title: string;
  description: string;
  createdAt: string | Date;
  resource: { id: string; service: string; name: string | null; resourceId: string } | null;
};

export function FindingsTable({
  findings,
  showResourceColumn = true,
}: {
  findings: FindingRow[];
  showResourceColumn?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Severity</TableHead>
          <TableHead>Finding</TableHead>
          {showResourceColumn ? <TableHead>Resource</TableHead> : null}
          <TableHead>Detected</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {findings.map((finding) => (
          <TableRow key={finding.id}>
            <TableCell>
              <SeverityBadge severity={finding.severity} />
            </TableCell>
            <TableCell className="max-w-md whitespace-normal">
              <p className="font-medium">{finding.title}</p>
              <p className="text-xs text-muted-foreground">{finding.description}</p>
            </TableCell>
            {showResourceColumn ? (
              <TableCell>
                {finding.resource ? (
                  <Link
                    href={`/infrastructure/${finding.resource.id}`}
                    className="font-mono text-xs text-foreground hover:underline"
                  >
                    {finding.resource.name ?? finding.resource.resourceId}
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
            ) : null}
            <TableCell className="text-xs text-muted-foreground">
              <FormattedDateTime value={finding.createdAt} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
