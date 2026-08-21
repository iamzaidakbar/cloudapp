import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { JobTypeBadge } from "@/components/jobs/job-type-badge";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import { StaggerItem } from "@/components/motion/stagger-list";
import type { JobRow } from "@/lib/jobs";

// AUDIT/COMPARISON each have their own detail page, so the # column links
// straight there. TERRAFORM/APPLY/VERIFICATION/ROLLBACK have no detail page
// of their own (they only ever render inline as the *latest* run on their
// migration plan's page — see this phase's plan for why) — for those, the #
// column is plain text and the Context column carries the only real link,
// to the plan itself.
function ownDetailHref(row: JobRow): string | null {
  if (row.type === "AUDIT") return `/audits/${row.id}`;
  if (row.type === "COMPARISON") return `/comparisons/${row.id}`;
  return null;
}

export function JobsTable({ jobs }: { jobs: JobRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>#</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Started</TableHead>
          <TableHead>Finished</TableHead>
          <TableHead>Context</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job, index) => {
          const detailHref = ownDetailHref(job);
          return (
            <TableRow key={`${job.type}-${job.id}`}>
              <TableCell>
                <StaggerItem index={index}>
                  <JobTypeBadge type={job.type} />
                </StaggerItem>
              </TableCell>
              <TableCell className="font-mono text-xs">
                <StaggerItem index={index}>
                  {detailHref ? (
                    <Link href={detailHref} className="hover:underline">
                      #{job.version}
                    </Link>
                  ) : (
                    `#${job.version}`
                  )}
                </StaggerItem>
              </TableCell>
              <TableCell>
                <StaggerItem index={index}>
                  <JobStatusBadge status={job.status} />
                </StaggerItem>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                <StaggerItem index={index}>
                  {job.startedAt ? <FormattedDateTime value={job.startedAt} /> : "—"}
                </StaggerItem>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                <StaggerItem index={index}>
                  {job.finishedAt ? <FormattedDateTime value={job.finishedAt} /> : "—"}
                </StaggerItem>
              </TableCell>
              <TableCell className="text-xs">
                <StaggerItem index={index}>
                  {job.migrationPlanId ? (
                    <Link href={`/migrations/${job.migrationPlanId}`} className="text-muted-foreground hover:underline">
                      Migration #{job.migrationPlanSequenceNumber ?? "?"}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </StaggerItem>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
