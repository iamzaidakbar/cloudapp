import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import type { AwsServiceType } from "@/lib/generated/prisma/client";

const SERVICE_LABEL: Partial<Record<AwsServiceType, string>> = {
  EC2_INSTANCE: "EC2",
  S3_BUCKET: "S3",
  RDS_INSTANCE: "RDS",
  LAMBDA_FUNCTION: "Lambda",
  VPC: "VPC",
};

export type ComparisonItemRow = {
  id: string;
  auditResourceId: string;
  awsService: AwsServiceType;
  awsResourceId: string;
  awsResourceName: string | null;
  region: string;
  awsSizeLabel: string | null;
  gcpService: string;
  gcpSizeLabel: string | null;
  currentAwsMonthlyCost: string | number | null;
  gcpLikeForLikeMonthlyCost: string | number | null;
  gcpOptimizedMonthlyCost: string | number | null;
  costAvailable: boolean;
  estimatedMigrationCost: string | number | null;
};

function CostCell({ value, available }: { value: string | number | null; available: boolean }) {
  return <TableCell>{available && value !== null ? formatCurrency(value) : "N/A"}</TableCell>;
}

export function ComparisonItemsTable({ items }: { items: ComparisonItemRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Service</TableHead>
            <TableHead>AWS Resource</TableHead>
            <TableHead>Region</TableHead>
            <TableHead>GCP Target</TableHead>
            <TableHead>Current AWS Cost</TableHead>
            <TableHead>GCP Like-for-Like</TableHead>
            <TableHead>GCP Optimized</TableHead>
            <TableHead>Migration Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="whitespace-nowrap">{SERVICE_LABEL[item.awsService] ?? item.awsService}</TableCell>
              <TableCell className="max-w-48">
                <Link href={`/infrastructure/${item.auditResourceId}`} className="font-mono text-xs text-foreground hover:underline">
                  {item.awsResourceName ?? item.awsResourceId}
                </Link>
                {item.awsSizeLabel ? <p className="text-xs text-muted-foreground">{item.awsSizeLabel}</p> : null}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{item.region}</TableCell>
              <TableCell className="whitespace-nowrap">
                <p>{item.gcpService}</p>
                {item.gcpSizeLabel ? <p className="font-mono text-xs text-muted-foreground">{item.gcpSizeLabel}</p> : null}
              </TableCell>
              <CostCell value={item.currentAwsMonthlyCost} available={item.costAvailable} />
              <CostCell value={item.gcpLikeForLikeMonthlyCost} available={item.costAvailable} />
              <CostCell value={item.gcpOptimizedMonthlyCost} available={item.costAvailable} />
              <TableCell>
                {item.estimatedMigrationCost !== null ? formatCurrency(item.estimatedMigrationCost) : "N/A"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
