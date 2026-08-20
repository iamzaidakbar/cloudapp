import { createHash } from "node:crypto";
import { ALL_SERVICE_TYPES } from "@/lib/aws/audit/types";
import type { CollectedResource } from "@/lib/aws/audit/types";
import type { OnServiceComplete, CollectionSummary } from "@/lib/aws/audit/collect";
import type { AwsServiceType } from "@/lib/generated/prisma/client";

const REGIONS = ["us-east-1", "us-west-2", "eu-west-1"];

// Deterministic PRNG seeded from a string, so the same tenant+version always
// produces the same simulated inventory (mulberry32).
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

function pick<T>(rand: () => number, items: T[]): T {
  return items[Math.floor(rand() * items.length)];
}

function fakeTags(rand: () => number, includeTags: boolean): Record<string, string> {
  if (!includeTags) return {};
  return {
    Environment: pick(rand, ["production", "staging", "development"]),
    Owner: pick(rand, ["platform-team", "data-team", "web-team"]),
  };
}

const SERVICE_LABEL: Record<AwsServiceType, string> = {
  EC2_INSTANCE: "ec2",
  EBS_VOLUME: "vol",
  SECURITY_GROUP: "sg",
  VPC: "vpc",
  S3_BUCKET: "s3",
  RDS_INSTANCE: "rds",
  LAMBDA_FUNCTION: "lambda",
  ELB_LOAD_BALANCER: "elb",
  IAM_ROLE: "iam",
  CLOUDWATCH_LOG_GROUP: "logs",
};

function collectService(service: AwsServiceType, rand: () => number, seedTag: string): CollectedResource[] {
  const count = 3 + Math.floor(rand() * 6); // 3–8 resources
  const resources: CollectedResource[] = [];

  for (let i = 0; i < count; i += 1) {
    const region = pick(rand, REGIONS);
    const includeTags = rand() > 0.25;
    const resourceId = `${SERVICE_LABEL[service]}-simulated-${seedTag}-${i.toString().padStart(2, "0")}`;
    const base: CollectedResource = {
      service,
      resourceId,
      name: `${SERVICE_LABEL[service]}-${i}`,
      region,
      status: "active",
      tags: fakeTags(rand, includeTags),
      rawConfig: { simulated: true, resourceId },
      monthlyCost: Math.round(rand() * 200 * 100) / 100,
      costAvailable: true,
      cpuUtilizationAvgPercent: null,
      cpuUtilizationDatapointCount: 0,
    };

    if (service === "EC2_INSTANCE") {
      base.status = rand() > 0.15 ? "running" : "stopped";
      base.instanceType = pick(rand, ["t3.micro", "t3.large", "m5.xlarge", "m5.2xlarge", "c5.4xlarge"]);
      // Mirrors the real DescribeInstances shape (InstanceType field) so
      // downstream consumers that read rawConfig directly — e.g. the
      // AWS->GCP comparison feature's instance-size mapping — see
      // realistic simulated data too, not just the normalized top-level field.
      base.rawConfig = { simulated: true, resourceId, InstanceType: base.instanceType };
      if (base.status === "running") {
        base.cpuUtilizationAvgPercent = Math.round(rand() * 100 * 10) / 10;
        base.cpuUtilizationDatapointCount = 336; // 14 days hourly
      }
    }

    if (service === "EBS_VOLUME") {
      base.encrypted = rand() > 0.3;
      base.status = rand() > 0.75 ? "available" : "in-use";
      const sizeGb = 8 + Math.floor(rand() * 500);
      base.rawConfig = { simulated: true, resourceId, Size: sizeGb };
    }

    if (service === "S3_BUCKET") {
      base.isPublic = rand() > 0.85;
    }

    if (service === "RDS_INSTANCE") {
      const instanceClass = pick(rand, ["db.t3.micro", "db.t3.medium", "db.m5.large", "db.r5.xlarge"]);
      const engine = pick(rand, ["mysql", "postgres", "mariadb"]);
      const allocatedStorage = 20 + Math.floor(rand() * 480);
      base.rawConfig = {
        simulated: true,
        resourceId,
        DBInstanceClass: instanceClass,
        Engine: engine,
        AllocatedStorage: allocatedStorage,
      };
    }

    resources.push(base);
  }

  // Guarantee at least one instance of every relevant finding rule fires for
  // this service, regardless of what the random generation above produced,
  // so manual verification is exact and repeatable.
  if (service === "S3_BUCKET" && resources.length > 0) resources[0].isPublic = true;
  if (service === "EBS_VOLUME" && resources.length > 0) resources[0].encrypted = false;
  if (service === "EBS_VOLUME" && resources.length > 1) resources[1].status = "available";
  if (service === "EC2_INSTANCE" && resources.length > 0) {
    resources[0].status = "running";
    resources[0].cpuUtilizationAvgPercent = 3.2;
    resources[0].cpuUtilizationDatapointCount = 336;
    resources[0].instanceType = "t3.micro";
    resources[0].rawConfig = { simulated: true, resourceId: resources[0].resourceId, InstanceType: "t3.micro" };
  }
  if (service === "EC2_INSTANCE" && resources.length > 1) {
    resources[1].status = "running";
    resources[1].cpuUtilizationAvgPercent = 4.1;
    resources[1].cpuUtilizationDatapointCount = 336;
    resources[1].instanceType = "m5.2xlarge";
    resources[1].rawConfig = { simulated: true, resourceId: resources[1].resourceId, InstanceType: "m5.2xlarge" };
  }
  if (resources.length > 0) resources[resources.length - 1].tags = {};

  return resources;
}

export async function collectWithDevAdapter(
  seed: string,
  onComplete: OnServiceComplete,
): Promise<CollectionSummary> {
  const rand = seededRandom(seed);
  const versionSuffix = seed.split(":").pop() ?? "0";
  const version = Number.parseInt(versionSuffix, 10) || 0;

  // Deterministically fail one service every 4th run, to exercise the
  // partial-failure UI without requiring real AWS.
  const failedService = version % 4 === 0 ? pick(rand, ALL_SERVICE_TYPES) : null;
  const seedTag = seed.replace(/[^a-z0-9]/gi, "");
  let totalMonthlyCost = 0;

  for (const service of ALL_SERVICE_TYPES) {
    // Small simulated delay between services so per-service status
    // transitions are observable over real wall-clock time when polled —
    // only the data is fake, the progression is real.
    await new Promise((resolve) => setTimeout(resolve, 150));

    if (service === failedService) {
      await onComplete({
        service,
        status: "FAILED",
        resourceCount: 0,
        errorMessage: "Simulated AccessDenied (dev adapter): the assumed role lacks permission for this service.",
        resources: [],
      });
      continue;
    }

    const resources = collectService(service, rand, seedTag);
    totalMonthlyCost += resources.reduce((sum, r) => sum + (r.monthlyCost ?? 0), 0);
    await onComplete({
      service,
      status: "SUCCEEDED",
      resourceCount: resources.length,
      errorMessage: null,
      resources,
    });
  }

  return {
    dataSource: "DEV_ADAPTER",
    estimatedMonthlyCost: Math.round(totalMonthlyCost * 100) / 100,
    utilizationDataAvailable: true,
  };
}
