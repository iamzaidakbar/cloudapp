// Static, public reference/spec data (NOT pricing — pricing always comes
// from a live API call, see aws-price-list.ts / gcp-billing-catalog.ts).
// Kept intentionally small: enough common instance families to make the
// comparison useful without trying to enumerate every AWS/GCP SKU shape.

export const AWS_REGION_LOCATION_NAME: Record<string, string> = {
  "us-east-1": "US East (N. Virginia)",
  "us-east-2": "US East (Ohio)",
  "us-west-1": "US West (N. California)",
  "us-west-2": "US West (Oregon)",
  "eu-west-1": "EU (Ireland)",
  "eu-west-2": "EU (London)",
  "eu-central-1": "EU (Frankfurt)",
  "ap-southeast-1": "Asia Pacific (Singapore)",
  "ap-southeast-2": "Asia Pacific (Sydney)",
  "ap-south-1": "Asia Pacific (Mumbai)",
  "ap-northeast-1": "Asia Pacific (Tokyo)",
};

// Approximate same-geography GCP region for a given AWS region — used only
// to scope GCP SKU lookups (Compute Engine/Cloud SQL prices vary by region),
// not claimed to be the "correct" migration target region.
export const AWS_TO_GCP_REGION: Record<string, string> = {
  "us-east-1": "us-east1",
  "us-east-2": "us-east4",
  "us-west-1": "us-west2",
  "us-west-2": "us-west1",
  "eu-west-1": "europe-west1",
  "eu-west-2": "europe-west2",
  "eu-central-1": "europe-west3",
  "ap-southeast-1": "asia-southeast1",
  "ap-southeast-2": "australia-southeast1",
  "ap-south-1": "asia-south1",
  "ap-northeast-1": "asia-northeast1",
};

export function toGcpRegion(awsRegion: string): string {
  return AWS_TO_GCP_REGION[awsRegion] ?? "us-central1";
}

export function toAwsLocationName(awsRegion: string): string {
  return AWS_REGION_LOCATION_NAME[awsRegion] ?? AWS_REGION_LOCATION_NAME["us-east-1"];
}

export type InstanceSpec = { vcpu: number; ramGb: number };

// AWS instance type -> {vCPU, RAM GiB}. Family-agnostic on purpose: the same
// table backs both EC2 instance types and RDS instance classes (their
// families share the same underlying compute shapes, e.g. db.m5.large ==
// m5.large's vcpu/ram), avoiding a second near-duplicate table.
const INSTANCE_SPECS: Record<string, InstanceSpec> = {
  "t3.micro": { vcpu: 2, ramGb: 1 },
  "t3.small": { vcpu: 2, ramGb: 2 },
  "t3.medium": { vcpu: 2, ramGb: 4 },
  "t3.large": { vcpu: 2, ramGb: 8 },
  "t3.xlarge": { vcpu: 4, ramGb: 16 },
  "t3.2xlarge": { vcpu: 8, ramGb: 32 },
  "t2.micro": { vcpu: 1, ramGb: 1 },
  "t2.small": { vcpu: 1, ramGb: 2 },
  "t2.medium": { vcpu: 2, ramGb: 4 },
  "t2.large": { vcpu: 2, ramGb: 8 },
  "m5.large": { vcpu: 2, ramGb: 8 },
  "m5.xlarge": { vcpu: 4, ramGb: 16 },
  "m5.2xlarge": { vcpu: 8, ramGb: 32 },
  "m5.4xlarge": { vcpu: 16, ramGb: 64 },
  "m6i.large": { vcpu: 2, ramGb: 8 },
  "m6i.xlarge": { vcpu: 4, ramGb: 16 },
  "m6i.2xlarge": { vcpu: 8, ramGb: 32 },
  "c5.large": { vcpu: 2, ramGb: 4 },
  "c5.xlarge": { vcpu: 4, ramGb: 8 },
  "c5.2xlarge": { vcpu: 8, ramGb: 16 },
  "c5.4xlarge": { vcpu: 16, ramGb: 32 },
  "c6i.large": { vcpu: 2, ramGb: 4 },
  "c6i.xlarge": { vcpu: 4, ramGb: 8 },
  "r5.large": { vcpu: 2, ramGb: 16 },
  "r5.xlarge": { vcpu: 4, ramGb: 32 },
  "r5.2xlarge": { vcpu: 8, ramGb: 64 },
  "r6i.large": { vcpu: 2, ramGb: 16 },
  "r6i.xlarge": { vcpu: 4, ramGb: 32 },
};

// Falls back to a coarse vcpu-count guess parsed from the size suffix
// (e.g. "xlarge" ~ 4 vcpu) for instance types outside the curated table
// above, rather than refusing to price/map an unrecognized type.
const SIZE_SUFFIX_VCPU: Array<[RegExp, number]> = [
  [/\.nano$/, 1],
  [/\.micro$/, 1],
  [/\.small$/, 1],
  [/\.medium$/, 2],
  [/\.large$/, 2],
  [/\.xlarge$/, 4],
  [/\.2xlarge$/, 8],
  [/\.4xlarge$/, 16],
  [/\.8xlarge$/, 32],
  [/\.12xlarge$/, 48],
  [/\.16xlarge$/, 64],
];

export function getAwsInstanceSpec(instanceType: string): InstanceSpec {
  const known = INSTANCE_SPECS[instanceType];
  if (known) return known;

  const match = SIZE_SUFFIX_VCPU.find(([pattern]) => pattern.test(instanceType));
  const vcpu = match ? match[1] : 2;
  // AWS general-purpose families average ~4 GiB RAM per vCPU; used only as a
  // last-resort estimate for instance types absent from the curated table.
  return { vcpu, ramGb: vcpu * 4 };
}

export type GcpMachineType = { name: string; family: "e2-standard" | "n2-standard"; vcpu: number; ramGb: number };

const GCP_MACHINE_TYPES: GcpMachineType[] = [
  { name: "e2-small", family: "e2-standard", vcpu: 2, ramGb: 2 },
  { name: "e2-medium", family: "e2-standard", vcpu: 2, ramGb: 4 },
  { name: "e2-standard-2", family: "e2-standard", vcpu: 2, ramGb: 8 },
  { name: "e2-standard-4", family: "e2-standard", vcpu: 4, ramGb: 16 },
  { name: "e2-standard-8", family: "e2-standard", vcpu: 8, ramGb: 32 },
  { name: "e2-standard-16", family: "e2-standard", vcpu: 16, ramGb: 64 },
  { name: "e2-standard-32", family: "e2-standard", vcpu: 32, ramGb: 128 },
  { name: "n2-standard-2", family: "n2-standard", vcpu: 2, ramGb: 8 },
  { name: "n2-standard-4", family: "n2-standard", vcpu: 4, ramGb: 16 },
  { name: "n2-standard-8", family: "n2-standard", vcpu: 8, ramGb: 32 },
  { name: "n2-standard-16", family: "n2-standard", vcpu: 16, ramGb: 64 },
  { name: "n2-standard-32", family: "n2-standard", vcpu: 32, ramGb: 128 },
  { name: "n2-standard-48", family: "n2-standard", vcpu: 48, ramGb: 192 },
  { name: "n2-standard-64", family: "n2-standard", vcpu: 64, ramGb: 256 },
];

// Burstable AWS families (t2/t3/t4g) map to GCP's cost-optimized e2-standard
// line; everything else maps to n2-standard (balanced general purpose) —
// deliberately not distinguishing compute/memory-optimized sub-families
// (c5/r5) into GCP's highcpu/highmem variants, to keep the SKU-matching
// surface to 2 machine families total. Picked by nearest vCPU (ties broken
// by whichever candidate's RAM is closer), never a smaller vCPU than asked.
export function pickGcpMachineType(instanceType: string, vcpu: number, ramGb: number): GcpMachineType {
  const family: GcpMachineType["family"] = /^t[234]?g?\./.test(instanceType) ? "e2-standard" : "n2-standard";
  const candidates = GCP_MACHINE_TYPES.filter((m) => m.family === family && m.vcpu >= vcpu);
  const pool = candidates.length > 0 ? candidates : GCP_MACHINE_TYPES.filter((m) => m.family === family);

  return pool.reduce((best, candidate) => {
    const bestRamDiff = Math.abs(best.ramGb - ramGb);
    const candidateRamDiff = Math.abs(candidate.ramGb - ramGb);
    if (candidate.vcpu !== best.vcpu) return candidate.vcpu < best.vcpu ? candidate : best;
    return candidateRamDiff < bestRamDiff ? candidate : best;
  }, pool[pool.length - 1]);
}

// One size down in the same family, for the "optimized" recommendation when
// the source resource is genuinely underutilized. Never goes below the
// smallest size in that family.
export function stepDownMachineType(machine: GcpMachineType): GcpMachineType {
  const family = GCP_MACHINE_TYPES.filter((m) => m.family === machine.family).sort((a, b) => a.vcpu - b.vcpu);
  const index = family.findIndex((m) => m.name === machine.name);
  return index > 0 ? family[index - 1] : machine;
}
