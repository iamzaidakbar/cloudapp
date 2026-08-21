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
    <Table className="table-fixed">
      <TableHeader className="bg-card">
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[9rem] text-[11px] uppercase tracking-wider">
            Service
          </TableHead>
          <TableHead className="text-[11px] uppercase tracking-wider">
            Resource
          </TableHead>
          <TableHead className="w-[7.5rem] text-[11px] uppercase tracking-wider">
            Region
          </TableHead>
          <TableHead className="w-[7rem] text-[11px] uppercase tracking-wider">
            Status
          </TableHead>
          <TableHead className="w-[7rem] text-[11px] uppercase tracking-wider">
            Environment
          </TableHead>
          <TableHead className="w-[5rem] text-[11px] uppercase tracking-wider">
            Tags
          </TableHead>
          <TableHead className="w-[6.5rem] text-[11px] uppercase tracking-wider">
            Cost
          </TableHead>
          <TableHead className="w-[9.5rem] text-[11px] uppercase tracking-wider">
            Collected
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((resource) => {
          const tagCount = Object.keys(resource.tags).length;
          return (
            <TableRow key={resource.id} className="group relative">
              <TableCell>
                <span className="inline-block max-w-full truncate border border-border bg-muted/50 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {SERVICE_LABEL[resource.service]}
                </span>
              </TableCell>
              <TableCell className="max-w-0">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Link
                    href={`/infrastructure/${resource.id}`}
                    className="truncate font-medium text-foreground after:absolute after:inset-0 group-hover:underline"
                  >
                    {resource.name ?? resource.resourceId}
                  </Link>
                  {dataSource ? (
                    <span className="relative z-10 shrink-0">
                      <DataSourceBadge dataSource={dataSource} compact />
                    </span>
                  ) : null}
                </div>
                <p className="relative z-10 mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                  {resource.resourceId}
                </p>
              </TableCell>
              <TableCell className="font-mono text-xs">{resource.region}</TableCell>
              <TableCell>
                <ResourceStatusBadge status={resource.status} />
              </TableCell>
              <TableCell className="truncate text-muted-foreground">
                {resource.environment ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {tagCount > 0
                  ? `${tagCount} tag${tagCount === 1 ? "" : "s"}`
                  : "—"}
              </TableCell>
              <TableCell className="tabular-nums">
                {resource.costAvailable && resource.monthlyCost !== null
                  ? formatCurrency(resource.monthlyCost)
                  : "—"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                <FormattedDateTime value={resource.createdAt} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
