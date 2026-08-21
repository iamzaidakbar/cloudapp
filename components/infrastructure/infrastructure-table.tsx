import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResourceStatusBadge } from "@/components/infrastructure/resource-status-badge";
import { DataSourceBadge } from "@/components/aws/data-source-badge";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import { StaggerItem } from "@/components/motion/stagger-list";
import { formatCurrency } from "@/lib/format";
import type { AwsServiceType } from "@/lib/generated/prisma/client";

const SERVICE_LABEL: Record<AwsServiceType, string> = {
  EC2_INSTANCE: "EC2",
  EBS_VOLUME: "EBS",
  SECURITY_GROUP: "Security Group",
  VPC: "VPC",
  S3_BUCKET: "S3",
  RDS_INSTANCE: "RDS",
  LAMBDA_FUNCTION: "Lambda",
  ELB_LOAD_BALANCER: "ELB",
  IAM_ROLE: "IAM",
  CLOUDWATCH_LOG_GROUP: "CloudWatch Logs",
};

export type InfrastructureRow = {
  id: string;
  service: AwsServiceType;
  resourceId: string;
  name: string | null;
  region: string;
  status: string | null;
  environment: string | null;
  tags: Record<string, string>;
  monthlyCost: string | number | null;
  costAvailable: boolean;
  createdAt: string | Date;
};

export function InfrastructureTable({
  items,
  dataSource,
}: {
  items: InfrastructureRow[];
  dataSource: "AWS" | "DEV_ADAPTER" | null;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Service</TableHead>
          <TableHead>Resource</TableHead>
          <TableHead>Region</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Environment</TableHead>
          <TableHead>Tags</TableHead>
          <TableHead>Cost</TableHead>
          <TableHead>Last Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((resource, index) => {
          const tagCount = Object.keys(resource.tags).length;
          return (
            <TableRow key={resource.id} className="relative">
              <TableCell className="text-muted-foreground">
                <StaggerItem index={index}>{SERVICE_LABEL[resource.service]}</StaggerItem>
              </TableCell>
              <TableCell>
                <StaggerItem index={index}>
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/infrastructure/${resource.id}`}
                      className="font-medium text-foreground after:absolute after:inset-0 hover:underline"
                    >
                      {resource.name ?? resource.resourceId}
                    </Link>
                    {dataSource ? <DataSourceBadge dataSource={dataSource} compact /> : null}
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">{resource.resourceId}</p>
                </StaggerItem>
              </TableCell>
              <TableCell className="font-mono text-xs">
                <StaggerItem index={index}>{resource.region}</StaggerItem>
              </TableCell>
              <TableCell>
                <StaggerItem index={index}>
                  <ResourceStatusBadge status={resource.status} />
                </StaggerItem>
              </TableCell>
              <TableCell className="text-muted-foreground">
                <StaggerItem index={index}>{resource.environment ?? "—"}</StaggerItem>
              </TableCell>
              <TableCell className="text-muted-foreground">
                <StaggerItem index={index}>
                  {tagCount > 0 ? `${tagCount} tag${tagCount === 1 ? "" : "s"}` : "—"}
                </StaggerItem>
              </TableCell>
              <TableCell>
                <StaggerItem index={index}>
                  {resource.costAvailable && resource.monthlyCost !== null
                    ? formatCurrency(resource.monthlyCost)
                    : "—"}
                </StaggerItem>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                <StaggerItem index={index}>
                  <FormattedDateTime value={resource.createdAt} />
                </StaggerItem>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
