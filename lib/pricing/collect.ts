import { isAwsConfigured } from "@/lib/aws/is-configured";
import { isGcpBillingConfigured } from "@/lib/gcp/is-configured";
import { priceWithDevAdapter } from "@/lib/pricing/dev-adapter";
import { mapAwsResourceToGcp } from "@/lib/pricing/mapping";
import { getEc2MonthlyPrice, getRdsMonthlyPrice, getS3MonthlyPricePerGb, getDataTransferOutPricePerGb } from "@/lib/pricing/aws-price-list";
import { getComputeEngineMonthlyPrice, getCloudSqlMonthlyPrice, getCloudStorageMonthlyPricePerGb } from "@/lib/pricing/gcp-billing-catalog";
import { getS3BucketSizeGb } from "@/lib/pricing/cloudwatch-extra";
import type { AssumedRoleCredentials } from "@/lib/aws/sts";
import type { ComparisonSourceItem, OnItemComplete, PricedComparisonItem, PricingSummary } from "@/lib/pricing/types";
import type { GcpMachineType } from "@/lib/pricing/reference-data";

function gcpFamily(machine: GcpMachineType): "E2" | "N2" {
  return machine.family === "e2-standard" ? "E2" : "N2";
}

async function priceEc2(item: ComparisonSourceItem): Promise<Partial<PricedComparisonItem> & { migrationSizeGb: number }> {
  const mapping = mapAwsResourceToGcp(item);
  const rawConfig = item.rawConfig as { InstanceType?: string } | null;
  const instanceType = rawConfig?.InstanceType ?? "unknown";

  const [currentAwsMonthlyCost, likeForLikePrice] = await Promise.all([
    getEc2MonthlyPrice(instanceType, item.region),
    mapping.likeForLikeMachine
      ? getComputeEngineMonthlyPrice(
          mapping.likeForLikeMachine.vcpu,
          mapping.likeForLikeMachine.ramGb,
          item.region,
          gcpFamily(mapping.likeForLikeMachine),
        )
      : Promise.resolve(null),
  ]);

  const optimizedPrice =
    mapping.optimizedMachine && mapping.optimizedMachine.name !== mapping.likeForLikeMachine?.name
      ? await getComputeEngineMonthlyPrice(
          mapping.optimizedMachine.vcpu,
          mapping.optimizedMachine.ramGb,
          item.region,
          gcpFamily(mapping.optimizedMachine),
        )
      : likeForLikePrice;

  const migrationSizeGb = item.attachedVolumeSizesGb.reduce((sum, gb) => sum + gb, 0);

  return {
    gcpService: mapping.gcpService,
    awsSizeLabel: mapping.awsSizeLabel,
    gcpSizeLabel: mapping.gcpSizeLabel,
    performanceNotes: mapping.performanceNotes,
    currentAwsMonthlyCost,
    gcpLikeForLikeMonthlyCost: likeForLikePrice,
    gcpOptimizedMonthlyCost: optimizedPrice,
    costAvailable: currentAwsMonthlyCost !== null && likeForLikePrice !== null,
    migrationSizeGb,
  };
}

async function priceRds(item: ComparisonSourceItem): Promise<Partial<PricedComparisonItem> & { migrationSizeGb: number }> {
  const mapping = mapAwsResourceToGcp(item);
  const rawConfig = item.rawConfig as { DBInstanceClass?: string; Engine?: string; AllocatedStorage?: number } | null;
  const instanceClass = rawConfig?.DBInstanceClass ?? "unknown";
  const engine = rawConfig?.Engine ?? "";

  const [currentAwsMonthlyCost, gcpPrice] = await Promise.all([
    getRdsMonthlyPrice(instanceClass, engine, item.region),
    mapping.rdsEngine && mapping.likeForLikeMachine
      ? getCloudSqlMonthlyPrice(mapping.likeForLikeMachine.vcpu, mapping.likeForLikeMachine.ramGb, item.region, mapping.rdsEngine)
      : Promise.resolve(null),
  ]);

  return {
    gcpService: mapping.gcpService,
    awsSizeLabel: mapping.awsSizeLabel,
    gcpSizeLabel: mapping.gcpSizeLabel,
    performanceNotes: mapping.performanceNotes,
    currentAwsMonthlyCost,
    gcpLikeForLikeMonthlyCost: gcpPrice,
    gcpOptimizedMonthlyCost: gcpPrice,
    costAvailable: currentAwsMonthlyCost !== null && gcpPrice !== null,
    migrationSizeGb: rawConfig?.AllocatedStorage ?? 0,
  };
}

async function priceS3(
  item: ComparisonSourceItem,
  tenantCredentials: AssumedRoleCredentials,
): Promise<Partial<PricedComparisonItem> & { migrationSizeGb: number }> {
  const mapping = mapAwsResourceToGcp(item);
  const bucketSizeGb = await getS3BucketSizeGb(tenantCredentials, item.region, item.resourceId);

  if (bucketSizeGb === null) {
    return {
      gcpService: mapping.gcpService,
      gcpSizeLabel: mapping.gcpSizeLabel,
      performanceNotes: `${mapping.performanceNotes} Bucket size unavailable (no CloudWatch storage datapoints yet).`,
      currentAwsMonthlyCost: null,
      gcpLikeForLikeMonthlyCost: null,
      gcpOptimizedMonthlyCost: null,
      costAvailable: false,
      migrationSizeGb: 0,
    };
  }

  const [awsPricePerGb, gcpPricePerGb] = await Promise.all([
    getS3MonthlyPricePerGb(item.region),
    getCloudStorageMonthlyPricePerGb(item.region),
  ]);

  const currentAwsMonthlyCost = awsPricePerGb !== null ? Math.round(awsPricePerGb * bucketSizeGb * 100) / 100 : null;
  const gcpMonthlyCost = gcpPricePerGb !== null ? Math.round(gcpPricePerGb * bucketSizeGb * 100) / 100 : null;

  return {
    gcpService: mapping.gcpService,
    gcpSizeLabel: mapping.gcpSizeLabel,
    performanceNotes: `${mapping.performanceNotes} (${bucketSizeGb.toFixed(1)} GiB stored)`,
    currentAwsMonthlyCost,
    gcpLikeForLikeMonthlyCost: gcpMonthlyCost,
    gcpOptimizedMonthlyCost: gcpMonthlyCost,
    costAvailable: currentAwsMonthlyCost !== null && gcpMonthlyCost !== null,
    migrationSizeGb: bucketSizeGb,
  };
}

async function priceWithRealApis(
  items: ComparisonSourceItem[],
  tenantCredentials: AssumedRoleCredentials,
  onComplete: OnItemComplete,
): Promise<PricingSummary> {
  let totalAws = 0;
  let totalLikeForLike = 0;
  let totalOptimized = 0;
  let anyCostAvailable = false;
  const region = items[0]?.region ?? "us-east-1";
  const dataTransferPricePerGb = await getDataTransferOutPricePerGb(region);

  for (const item of items) {
    const mapping = mapAwsResourceToGcp(item);
    let priced: Partial<PricedComparisonItem> & { migrationSizeGb: number };

    if (item.service === "EC2_INSTANCE") priced = await priceEc2(item);
    else if (item.service === "RDS_INSTANCE") priced = await priceRds(item);
    else if (item.service === "S3_BUCKET") priced = await priceS3(item, tenantCredentials);
    else if (item.service === "VPC") {
      priced = {
        gcpService: mapping.gcpService,
        performanceNotes: mapping.performanceNotes,
        currentAwsMonthlyCost: 0,
        gcpLikeForLikeMonthlyCost: 0,
        gcpOptimizedMonthlyCost: 0,
        costAvailable: true,
        migrationSizeGb: 0,
      };
    } else {
      priced = {
        gcpService: mapping.gcpService,
        performanceNotes: mapping.performanceNotes,
        currentAwsMonthlyCost: null,
        gcpLikeForLikeMonthlyCost: null,
        gcpOptimizedMonthlyCost: null,
        costAvailable: false,
        migrationSizeGb: 0,
      };
    }

    const estimatedMigrationCost =
      priced.migrationSizeGb > 0 && dataTransferPricePerGb !== null
        ? Math.round(priced.migrationSizeGb * dataTransferPricePerGb * 100) / 100
        : null;

    if (priced.costAvailable) {
      totalAws += priced.currentAwsMonthlyCost ?? 0;
      totalLikeForLike += priced.gcpLikeForLikeMonthlyCost ?? 0;
      totalOptimized += priced.gcpOptimizedMonthlyCost ?? 0;
      anyCostAvailable = true;
    }

    await onComplete({
      auditResourceId: item.auditResourceId,
      awsService: item.service,
      awsResourceId: item.resourceId,
      awsResourceName: item.name,
      region: item.region,
      awsSizeLabel: priced.awsSizeLabel ?? mapping.awsSizeLabel,
      gcpService: priced.gcpService ?? mapping.gcpService,
      gcpSizeLabel: priced.gcpSizeLabel ?? mapping.gcpSizeLabel,
      currentAwsMonthlyCost: priced.currentAwsMonthlyCost ?? null,
      gcpLikeForLikeMonthlyCost: priced.gcpLikeForLikeMonthlyCost ?? null,
      gcpOptimizedMonthlyCost: priced.gcpOptimizedMonthlyCost ?? null,
      costAvailable: priced.costAvailable ?? false,
      estimatedMigrationCost,
      performanceNotes: priced.performanceNotes ?? mapping.performanceNotes,
    });
  }

  return {
    awsDataSource: "AWS",
    gcpDataSource: "GCP",
    totalAwsMonthlyCost: Math.round(totalAws * 100) / 100,
    totalGcpLikeForLikeCost: Math.round(totalLikeForLike * 100) / 100,
    totalGcpOptimizedCost: Math.round(totalOptimized * 100) / 100,
    costDataAvailable: anyCostAvailable,
  };
}

// The only entry point run-comparison.ts should call — mirrors
// lib/aws/audit/collect.ts's collectAwsInventory() convention exactly: both
// AWS pricing AND GCP pricing must be genuinely configured for the real
// path to run at all, so a comparison never mixes real dollars on one side
// with simulated dollars on the other.
export async function priceComparisonItems(
  items: ComparisonSourceItem[],
  tenantCredentials: AssumedRoleCredentials | null,
  devSeed: string,
  onComplete: OnItemComplete,
): Promise<PricingSummary> {
  if (isAwsConfigured() && isGcpBillingConfigured() && tenantCredentials) {
    return priceWithRealApis(items, tenantCredentials, onComplete);
  }
  return priceWithDevAdapter(items, devSeed, onComplete);
}
