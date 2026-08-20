import type { ComparisonSourceItem } from "@/lib/pricing/types";
import {
  getAwsInstanceSpec,
  pickGcpMachineType,
  stepDownMachineType,
  type GcpMachineType,
} from "@/lib/pricing/reference-data";

export type ResourceMapping = {
  gcpService: string;
  awsSizeLabel: string | null;
  gcpSizeLabel: string | null;
  performanceNotes: string | null;
  // Present only for EC2/RDS — the like-for-like and (possibly identical)
  // optimized GCP machine shape, driven by real CloudWatch utilization data
  // already collected during the audit, not a fabricated recommendation.
  likeForLikeMachine: GcpMachineType | null;
  optimizedMachine: GcpMachineType | null;
  rdsEngine: "MySQL" | "PostgreSQL" | null;
};

// Same threshold the existing "Underutilized EC2" audit finding rule uses,
// for consistency between the two features reading the same CloudWatch data.
const UNDERUTILIZED_CPU_THRESHOLD = 10;

function rdsEngineFilter(engine: unknown): "MySQL" | "PostgreSQL" | null {
  if (engine === "mysql") return "MySQL";
  if (engine === "postgres") return "PostgreSQL";
  return null;
}

export function mapAwsResourceToGcp(item: ComparisonSourceItem): ResourceMapping {
  if (item.service === "EC2_INSTANCE") {
    const rawConfig = item.rawConfig as { InstanceType?: string } | null;
    const instanceType = rawConfig?.InstanceType ?? "unknown";
    const spec = getAwsInstanceSpec(instanceType);
    const likeForLike = pickGcpMachineType(instanceType, spec.vcpu, spec.ramGb);
    const isUnderutilized =
      item.cpuUtilizationAvgPercent !== null && item.cpuUtilizationAvgPercent < UNDERUTILIZED_CPU_THRESHOLD;
    const optimized = isUnderutilized ? stepDownMachineType(likeForLike) : likeForLike;

    return {
      gcpService: "Compute Engine",
      awsSizeLabel: instanceType,
      gcpSizeLabel: likeForLike.name,
      performanceNotes: isUnderutilized
        ? `Average CPU utilization ${item.cpuUtilizationAvgPercent!.toFixed(1)}% over the last 14 days — sized down to ${optimized.name}.`
        : `${spec.vcpu} vCPU / ${spec.ramGb} GiB RAM, matched by nearest equivalent GCP shape.`,
      likeForLikeMachine: likeForLike,
      optimizedMachine: optimized,
      rdsEngine: null,
    };
  }

  if (item.service === "RDS_INSTANCE") {
    const rawConfig = item.rawConfig as { DBInstanceClass?: string; Engine?: string } | null;
    const instanceClass = rawConfig?.DBInstanceClass ?? "unknown";
    const bareInstanceType = instanceClass.replace(/^db\./, "");
    const spec = getAwsInstanceSpec(bareInstanceType);
    const likeForLike = pickGcpMachineType(bareInstanceType, spec.vcpu, spec.ramGb);
    const rdsEngine = rdsEngineFilter(rawConfig?.Engine);

    return {
      gcpService: "Cloud SQL",
      awsSizeLabel: instanceClass,
      gcpSizeLabel: `${spec.vcpu} vCPU / ${spec.ramGb} GiB (custom)`,
      performanceNotes: rdsEngine
        ? `${rawConfig?.Engine} — sized to match ${spec.vcpu} vCPU / ${spec.ramGb} GiB RAM.`
        : `Engine "${rawConfig?.Engine}" isn't in the currently supported Cloud SQL pricing set — mapping only.`,
      likeForLikeMachine: likeForLike,
      optimizedMachine: likeForLike,
      rdsEngine,
    };
  }

  if (item.service === "S3_BUCKET") {
    return {
      gcpService: "Cloud Storage",
      awsSizeLabel: null,
      gcpSizeLabel: "Standard storage",
      performanceNotes: "Standard storage class, like-for-like — object storage has no instance sizing to optimize.",
      likeForLikeMachine: null,
      optimizedMachine: null,
      rdsEngine: null,
    };
  }

  if (item.service === "LAMBDA_FUNCTION") {
    return {
      gcpService: "Cloud Run functions",
      awsSizeLabel: null,
      gcpSizeLabel: null,
      performanceNotes: "Usage-based pricing on both sides — current AWS cost isn't collected in this version.",
      likeForLikeMachine: null,
      optimizedMachine: null,
      rdsEngine: null,
    };
  }

  // VPC — no cost on either side.
  return {
    gcpService: "GCP VPC",
    awsSizeLabel: null,
    gcpSizeLabel: null,
    performanceNotes: "Networking construct — no direct cost on either AWS or GCP.",
    likeForLikeMachine: null,
    optimizedMachine: null,
    rdsEngine: null,
  };
}
