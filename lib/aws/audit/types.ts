import type { AwsServiceType } from "@/lib/generated/prisma/client";

export type CollectedResource = {
  service: AwsServiceType;
  resourceId: string;
  name: string | null;
  region: string;
  status: string | null;
  tags: Record<string, string>;
  rawConfig: unknown;
  monthlyCost: number | null;
  costAvailable: boolean;
  cpuUtilizationAvgPercent: number | null;
  cpuUtilizationDatapointCount: number;
  // Normalized signals the findings engine reads directly, rather than
  // parsing per-service rawConfig shapes itself — collectors are responsible
  // for extracting these; unset when not applicable to that service.
  isPublic?: boolean;
  encrypted?: boolean;
  instanceType?: string;
};

export type ServiceCollectionResult = {
  service: AwsServiceType;
  status: "SUCCEEDED" | "FAILED" | "SKIPPED";
  resourceCount: number;
  errorMessage: string | null;
  resources: CollectedResource[];
};

export const ALL_SERVICE_TYPES: AwsServiceType[] = [
  "EC2_INSTANCE",
  "EBS_VOLUME",
  "SECURITY_GROUP",
  "VPC",
  "S3_BUCKET",
  "RDS_INSTANCE",
  "LAMBDA_FUNCTION",
  "ELB_LOAD_BALANCER",
  "IAM_ROLE",
  "CLOUDWATCH_LOG_GROUP",
];

// Resource types for which "no tags" is a meaningful finding — IAM roles and
// log groups aren't typically cost-allocation-tagged, so we don't flag them.
export const TAGGABLE_SERVICE_TYPES: Set<AwsServiceType> = new Set([
  "EC2_INSTANCE",
  "EBS_VOLUME",
  "S3_BUCKET",
  "RDS_INSTANCE",
  "LAMBDA_FUNCTION",
  "ELB_LOAD_BALANCER",
]);
