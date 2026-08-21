import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StaggerItem } from "@/components/motion/stagger-list";
import { FadeIn } from "@/components/motion/fade-in";
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

function CostCell({ value, available, index }: { value: string | number | null; available: boolean; index: number }) {
  return (
    <TableCell>
      <StaggerItem index={index}>{available && value !== null ? formatCurrency(value) : "N/A"}</StaggerItem>
    </TableCell>
  );
}

export function ComparisonItemsTable({ items }: { items: ComparisonItemRow[] }) {
  return (
    <FadeIn delayMs={40}>
      <section className="border border-border bg-card">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border px-4 py-3 md:px-5">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-sm font-semibold tracking-tight">Mapped resources</h2>
            <p className="text-xs text-muted-foreground">
              {items.length.toLocaleString()} resource{items.length === 1 ? "" : "s"} with GCP targets
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
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
              {items.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap">
                    <StaggerItem index={index}>{SERVICE_LABEL[item.awsService] ?? item.awsService}</StaggerItem>
                  </TableCell>
                  <TableCell className="max-w-48">
                    <StaggerItem index={index}>
                      <Link href={`/infrastructure/${item.auditResourceId}`} className="font-mono text-xs text-foreground hover:underline">
                        {item.awsResourceName ?? item.awsResourceId}
                      </Link>
                      {item.awsSizeLabel ? <p className="text-xs text-muted-foreground">{item.awsSizeLabel}</p> : null}
                    </StaggerItem>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <StaggerItem index={index}>{item.region}</StaggerItem>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <StaggerItem index={index}>
                      <p>{item.gcpService}</p>
                      {item.gcpSizeLabel ? <p className="font-mono text-xs text-muted-foreground">{item.gcpSizeLabel}</p> : null}
                    </StaggerItem>
                  </TableCell>
                  <CostCell value={item.currentAwsMonthlyCost} available={item.costAvailable} index={index} />
                  <CostCell value={item.gcpLikeForLikeMonthlyCost} available={item.costAvailable} index={index} />
                  <CostCell value={item.gcpOptimizedMonthlyCost} available={item.costAvailable} index={index} />
                  <TableCell>
                    <StaggerItem index={index}>
                      {item.estimatedMigrationCost !== null ? formatCurrency(item.estimatedMigrationCost) : "N/A"}
                    </StaggerItem>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </FadeIn>
  );
}
