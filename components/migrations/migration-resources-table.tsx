import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StaggerItem } from "@/components/motion/stagger-list";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import { formatCurrency } from "@/lib/format";
import type { AwsServiceType } from "@/lib/generated/prisma/client";

const SERVICE_LABEL: Partial<Record<AwsServiceType, string>> = {
  EC2_INSTANCE: "EC2",
  S3_BUCKET: "S3",
  RDS_INSTANCE: "RDS",
  LAMBDA_FUNCTION: "Lambda",
};

export type MigrationResourceRow = {
  id: string;
  comparisonItemId: string;
  awsService: AwsServiceType;
  awsResourceId: string;
  awsResourceName: string | null;
  region: string;
  awsSizeLabel: string | null;
  gcpService: string;
  gcpSizeLabel: string | null;
  estimatedMigrationCost: string | number | null;
  gcpResourceSelfLink: string | null;
  provisionedAt: string | Date | null;
};

export function MigrationResourcesTable({ resources }: { resources: MigrationResourceRow[] }) {
  const anyProvisioned = resources.some((r) => r.provisionedAt);

  return (
    <div className="overflow-x-auto rounded-lg bg-glass-strong supports-backdrop-filter:bg-glass supports-backdrop-filter:backdrop-blur-md ring-1 ring-glass-border shadow-glass">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Service</TableHead>
            <TableHead>AWS Resource</TableHead>
            <TableHead>Region</TableHead>
            <TableHead>GCP Target</TableHead>
            <TableHead>Migration Cost</TableHead>
            {anyProvisioned ? <TableHead>Provisioned</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {resources.map((resource, index) => (
            <TableRow key={resource.id}>
              <TableCell className="whitespace-nowrap">
                <StaggerItem index={index}>{SERVICE_LABEL[resource.awsService] ?? resource.awsService}</StaggerItem>
              </TableCell>
              <TableCell className="max-w-48">
                <StaggerItem index={index}>
                  <span className="font-mono text-xs">{resource.awsResourceName ?? resource.awsResourceId}</span>
                  {resource.awsSizeLabel ? <p className="text-xs text-muted-foreground">{resource.awsSizeLabel}</p> : null}
                </StaggerItem>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                <StaggerItem index={index}>{resource.region}</StaggerItem>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <StaggerItem index={index}>
                  <p>{resource.gcpService}</p>
                  {resource.gcpSizeLabel ? <p className="font-mono text-xs text-muted-foreground">{resource.gcpSizeLabel}</p> : null}
                </StaggerItem>
              </TableCell>
              <TableCell>
                <StaggerItem index={index}>
                  {resource.estimatedMigrationCost !== null ? formatCurrency(resource.estimatedMigrationCost) : "N/A"}
                </StaggerItem>
              </TableCell>
              {anyProvisioned ? (
                <TableCell className="max-w-64">
                  <StaggerItem index={index}>
                    {resource.provisionedAt ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="truncate font-mono text-xs" title={resource.gcpResourceSelfLink ?? undefined}>
                          {resource.gcpResourceSelfLink}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          <FormattedDateTime value={resource.provisionedAt} />
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </StaggerItem>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
