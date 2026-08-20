import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    <div className="overflow-x-auto rounded-lg border">
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
          {resources.map((resource) => (
            <TableRow key={resource.id}>
              <TableCell className="whitespace-nowrap">{SERVICE_LABEL[resource.awsService] ?? resource.awsService}</TableCell>
              <TableCell className="max-w-48">
                <span className="font-mono text-xs">{resource.awsResourceName ?? resource.awsResourceId}</span>
                {resource.awsSizeLabel ? <p className="text-xs text-muted-foreground">{resource.awsSizeLabel}</p> : null}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{resource.region}</TableCell>
              <TableCell className="whitespace-nowrap">
                <p>{resource.gcpService}</p>
                {resource.gcpSizeLabel ? <p className="font-mono text-xs text-muted-foreground">{resource.gcpSizeLabel}</p> : null}
              </TableCell>
              <TableCell>
                {resource.estimatedMigrationCost !== null ? formatCurrency(resource.estimatedMigrationCost) : "N/A"}
              </TableCell>
              {anyProvisioned ? (
                <TableCell className="max-w-64">
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
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
