import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResourceStatusBadge } from "@/components/infrastructure/resource-status-badge";
import { DataSourceBadge } from "@/components/aws/data-source-badge";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import { StaggerItem } from "@/components/motion/stagger-list";
import { SERVICE_LABEL } from "@/components/infrastructure/service-labels";
import { formatCurrency } from "@/lib/format";
import type { AwsServiceType } from "@/lib/generated/prisma/client";

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
        <TableRow className="hover:bg-transparent">
          <TableHead className="text-[11px] uppercase tracking-wider">
            Service
          </TableHead>
          <TableHead className="text-[11px] uppercase tracking-wider">
            Resource
          </TableHead>
          <TableHead className="text-[11px] uppercase tracking-wider">
            Region
          </TableHead>
          <TableHead className="text-[11px] uppercase tracking-wider">
            Status
          </TableHead>
          <TableHead className="text-[11px] uppercase tracking-wider">
            Environment
          </TableHead>
          <TableHead className="text-[11px] uppercase tracking-wider">
            Tags
          </TableHead>
          <TableHead className="text-[11px] uppercase tracking-wider">
            Cost
          </TableHead>
          <TableHead className="text-[11px] uppercase tracking-wider">
            Collected
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((resource, index) => {
          const tagCount = Object.keys(resource.tags).length;
          return (
            <TableRow key={resource.id} className="group relative">
              <TableCell>
                <StaggerItem index={index}>
                  <span className="border border-border bg-muted/50 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {SERVICE_LABEL[resource.service]}
                  </span>
                </StaggerItem>
              </TableCell>
              <TableCell>
                <StaggerItem index={index}>
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/infrastructure/${resource.id}`}
                      className="font-medium text-foreground after:absolute after:inset-0 group-hover:underline"
                    >
                      {resource.name ?? resource.resourceId}
                    </Link>
                    {dataSource ? (
                      <DataSourceBadge dataSource={dataSource} compact />
                    ) : null}
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {resource.resourceId}
                  </p>
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
                <StaggerItem index={index}>
                  {resource.environment ?? "—"}
                </StaggerItem>
              </TableCell>
              <TableCell className="text-muted-foreground">
                <StaggerItem index={index}>
                  {tagCount > 0
                    ? `${tagCount} tag${tagCount === 1 ? "" : "s"}`
                    : "—"}
                </StaggerItem>
              </TableCell>
              <TableCell className="tabular-nums">
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
