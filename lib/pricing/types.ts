import type { AwsServiceType } from "@/lib/generated/prisma/client";

// The AwsServiceType values this feature can price/map — a subset of
// ALL_SERVICE_TYPES (lib/aws/audit/types.ts). Security groups, ELBs, IAM
// roles and CloudWatch log groups aren't in the spec's migration-support
// list (EC2/S3/RDS/Lambda/VPC) and have no meaningful GCP cost mapping.
export const COMPARABLE_SERVICE_TYPES: AwsServiceType[] = [
  "EC2_INSTANCE",
  "S3_BUCKET",
  "RDS_INSTANCE",
  "LAMBDA_FUNCTION",
  "VPC",
];

export type ComparisonSourceItem = {
  auditResourceId: string;
  service: AwsServiceType;
  resourceId: string;
  name: string | null;
  region: string;
  rawConfig: unknown;
  cpuUtilizationAvgPercent: number | null;
  // EC2 only — sizes (GiB) of EBS volumes attached to this instance, joined
  // by the caller from sibling EBS_VOLUME resources in the same audit run.
  attachedVolumeSizesGb: number[];
};

export type PricedComparisonItem = {
  auditResourceId: string;
  awsService: AwsServiceType;
  awsResourceId: string;
  awsResourceName: string | null;
  region: string;
  awsSizeLabel: string | null;
  gcpService: string;
  gcpSizeLabel: string | null;
  currentAwsMonthlyCost: number | null;
  gcpLikeForLikeMonthlyCost: number | null;
  gcpOptimizedMonthlyCost: number | null;
  costAvailable: boolean;
  estimatedMigrationCost: number | null;
  performanceNotes: string | null;
};

export type OnItemComplete = (item: PricedComparisonItem) => void | Promise<void>;

export type PricingSummary = {
  awsDataSource: "AWS" | "DEV_ADAPTER";
  gcpDataSource: "GCP" | "DEV_ADAPTER";
  totalAwsMonthlyCost: number | null;
  totalGcpLikeForLikeCost: number | null;
  totalGcpOptimizedCost: number | null;
  costDataAvailable: boolean;
};
