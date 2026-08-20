import { createHash } from "node:crypto";
import { mapAwsResourceToGcp } from "@/lib/pricing/mapping";
import type { ComparisonSourceItem, OnItemComplete, PricedComparisonItem, PricingSummary } from "@/lib/pricing/types";

// Same mulberry32 pattern as lib/aws/audit/dev-adapter.ts, seeded from the
// same ${tenantId}:${version} string so a given comparison version always
// produces the same simulated $ figures.
function seededRandom(seed: string) {
  let state = createHash("sha256").update(seed).digest().readUInt32LE(0);
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fakePrice(rand: () => number, min: number, max: number): number {
  return Math.round((min + rand() * (max - min)) * 100) / 100;
}

export async function priceWithDevAdapter(
  items: ComparisonSourceItem[],
  seed: string,
  onComplete: OnItemComplete,
): Promise<PricingSummary> {
  const rand = seededRandom(seed);

  let totalAws = 0;
  let totalLikeForLike = 0;
  let totalOptimized = 0;
  let anyCostAvailable = false;

  for (const item of items) {
    // Small simulated delay so per-item progress is observable over real
    // wall-clock time when polled — only the data is fake.
    await new Promise((resolve) => setTimeout(resolve, 80));

    const mapping = mapAwsResourceToGcp(item);
    const hasCost = item.service === "EC2_INSTANCE" || item.service === "RDS_INSTANCE" || item.service === "S3_BUCKET";
    const isVpc = item.service === "VPC";

    let currentAwsMonthlyCost: number | null = null;
    let gcpLikeForLikeMonthlyCost: number | null = null;
    let gcpOptimizedMonthlyCost: number | null = null;
    let estimatedMigrationCost: number | null = null;

    if (isVpc) {
      currentAwsMonthlyCost = 0;
      gcpLikeForLikeMonthlyCost = 0;
      gcpOptimizedMonthlyCost = 0;
    } else if (hasCost) {
      currentAwsMonthlyCost = fakePrice(rand, 15, 450);
      // GCP like-for-like is usually somewhat cheaper, optimized cheaper still.
      gcpLikeForLikeMonthlyCost = Math.round(currentAwsMonthlyCost * (0.75 + rand() * 0.15) * 100) / 100;
      gcpOptimizedMonthlyCost =
        mapping.optimizedMachine && mapping.optimizedMachine !== mapping.likeForLikeMachine
          ? Math.round(gcpLikeForLikeMonthlyCost * (0.5 + rand() * 0.2) * 100) / 100
          : gcpLikeForLikeMonthlyCost;
      estimatedMigrationCost = item.service === "EC2_INSTANCE" || item.service === "S3_BUCKET" ? fakePrice(rand, 1, 25) : null;

      totalAws += currentAwsMonthlyCost;
      totalLikeForLike += gcpLikeForLikeMonthlyCost;
      totalOptimized += gcpOptimizedMonthlyCost;
      anyCostAvailable = true;
    }

    const priced: PricedComparisonItem = {
      auditResourceId: item.auditResourceId,
      awsService: item.service,
      awsResourceId: item.resourceId,
      awsResourceName: item.name,
      region: item.region,
      awsSizeLabel: mapping.awsSizeLabel,
      gcpService: mapping.gcpService,
      gcpSizeLabel: mapping.gcpSizeLabel,
      currentAwsMonthlyCost,
      gcpLikeForLikeMonthlyCost,
      gcpOptimizedMonthlyCost,
      costAvailable: hasCost || isVpc,
      estimatedMigrationCost,
      performanceNotes: mapping.performanceNotes,
    };

    await onComplete(priced);
  }

  return {
    awsDataSource: "DEV_ADAPTER",
    gcpDataSource: "DEV_ADAPTER",
    totalAwsMonthlyCost: Math.round(totalAws * 100) / 100,
    totalGcpLikeForLikeCost: Math.round(totalLikeForLike * 100) / 100,
    totalGcpOptimizedCost: Math.round(totalOptimized * 100) / 100,
    costDataAvailable: anyCostAvailable,
  };
}
