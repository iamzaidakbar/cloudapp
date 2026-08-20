import { isAwsConfigured, isCostExplorerEnabled } from "@/lib/aws/is-configured";
import { assumeTenantRole, region as appRegion } from "@/lib/aws/sts";
import { getAccountMonthlyCost } from "@/lib/aws/audit/cost-explorer";
import { collectWithDevAdapter } from "@/lib/aws/audit/dev-adapter";
import {
  collectEc2Instances,
  collectEbsVolumes,
  collectSecurityGroups,
  collectVpcs,
  collectS3Buckets,
  collectRdsInstances,
  collectLambdaFunctions,
  collectLoadBalancers,
  collectIamRoles,
  collectCloudWatchLogGroups,
} from "@/lib/aws/audit/aws-collector";
import type { AssumedRoleCredentials } from "@/lib/aws/sts";
import type { CollectedResource, ServiceCollectionResult } from "@/lib/aws/audit/types";
import type { AwsServiceType } from "@/lib/generated/prisma/client";

export type OnServiceComplete = (result: ServiceCollectionResult) => void | Promise<void>;

export type CollectionSummary = {
  dataSource: "AWS" | "DEV_ADAPTER";
  estimatedMonthlyCost: number | null;
  utilizationDataAvailable: boolean;
};

type Collector = {
  service: AwsServiceType;
  run: (credentials: AssumedRoleCredentials) => Promise<CollectedResource[]>;
};

// Kicks off every service collector immediately and invokes onComplete the
// moment EACH ONE individually settles, rather than waiting for all of them
// — this is what makes per-service progress genuinely real (reflecting when
// AWS actually responded) instead of a client-side animation.
async function runCollectorsStreaming(
  collectors: Collector[],
  credentials: AssumedRoleCredentials,
  onComplete: OnServiceComplete,
): Promise<CollectedResource[]> {
  const allResources: CollectedResource[] = [];

  await Promise.all(
    collectors.map(async (collector) => {
      try {
        const resources = await collector.run(credentials);
        allResources.push(...resources);
        await onComplete({
          service: collector.service,
          status: "SUCCEEDED",
          resourceCount: resources.length,
          errorMessage: null,
          resources,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Audit collection failed for ${collector.service}:`, error);
        await onComplete({
          service: collector.service,
          status: "FAILED",
          resourceCount: 0,
          errorMessage: message.slice(0, 500),
          resources: [],
        });
      }
    }),
  );

  return allResources;
}

async function collectWithRealAws(
  roleArn: string,
  externalId: string,
  sessionName: string,
  onComplete: OnServiceComplete,
): Promise<CollectionSummary> {
  const credentials = await assumeTenantRole(roleArn, externalId, sessionName);
  const region = appRegion();

  const collectors: Collector[] = [
    { service: "EC2_INSTANCE", run: (c) => collectEc2Instances(c, region) },
    { service: "EBS_VOLUME", run: (c) => collectEbsVolumes(c, region) },
    { service: "SECURITY_GROUP", run: (c) => collectSecurityGroups(c, region) },
    { service: "VPC", run: (c) => collectVpcs(c, region) },
    { service: "RDS_INSTANCE", run: (c) => collectRdsInstances(c, region) },
    { service: "LAMBDA_FUNCTION", run: (c) => collectLambdaFunctions(c, region) },
    { service: "ELB_LOAD_BALANCER", run: (c) => collectLoadBalancers(c, region) },
    { service: "CLOUDWATCH_LOG_GROUP", run: (c) => collectCloudWatchLogGroups(c, region) },
    { service: "S3_BUCKET", run: (c) => collectS3Buckets(c) },
    { service: "IAM_ROLE", run: (c) => collectIamRoles(c) },
  ];

  const allResources = await runCollectorsStreaming(collectors, credentials, onComplete);

  const estimatedMonthlyCost = isCostExplorerEnabled() ? await getAccountMonthlyCost(credentials) : null;

  const utilizationDataAvailable = allResources.some(
    (r) => r.service === "EC2_INSTANCE" && r.cpuUtilizationAvgPercent !== null,
  );

  return { dataSource: "AWS", estimatedMonthlyCost, utilizationDataAvailable };
}

// The only entry point run-audit.ts should call — API/job code must never
// import the real collector or dev adapter directly, so the real-vs-
// simulated decision always lives in exactly one place (mirrors
// lib/aws/verify-connection.ts's existing convention). Streams per-service
// results via onComplete as each one finishes, real or simulated.
export async function collectAwsInventory(
  roleArn: string,
  externalId: string,
  sessionName: string,
  devSeed: string,
  onComplete: OnServiceComplete,
): Promise<CollectionSummary> {
  if (isAwsConfigured()) {
    return collectWithRealAws(roleArn, externalId, sessionName, onComplete);
  }
  return collectWithDevAdapter(devSeed, onComplete);
}
