import type { FindingSeverity, FindingType } from "@/lib/generated/prisma/client";
import type { CollectedResource } from "@/lib/aws/audit/types";
import { TAGGABLE_SERVICE_TYPES } from "@/lib/aws/audit/types";

export type DraftFinding = {
  type: FindingType;
  severity: FindingSeverity;
  title: string;
  description: string;
  remediation: string | null;
};

const LARGE_INSTANCE_SUFFIXES = [
  "2xlarge",
  "4xlarge",
  "8xlarge",
  "9xlarge",
  "12xlarge",
  "16xlarge",
  "18xlarge",
  "24xlarge",
  "32xlarge",
  "metal",
];

function isLargeInstanceType(instanceType: string | undefined) {
  if (!instanceType) return false;
  return LARGE_INSTANCE_SUFFIXES.some((suffix) => instanceType.endsWith(suffix));
}

const UNDERUTILIZED_CPU_THRESHOLD_PERCENT = 10;
// CloudWatch is queried hourly over 14 days (see cloudwatch.ts) — 24
// datapoints is one full day's worth, the minimum for a confident signal.
const MIN_CPU_DATAPOINTS_FOR_CONFIDENCE = 24;

export function evaluateFindingsForResource(resource: CollectedResource): DraftFinding[] {
  const findings: DraftFinding[] = [];

  if (resource.service === "S3_BUCKET" && resource.isPublic === true) {
    findings.push({
      type: "PUBLIC_S3_BUCKET",
      severity: "CRITICAL",
      title: "Public S3 Bucket",
      description: `Bucket "${resource.name ?? resource.resourceId}" allows public access via its ACL or bucket policy.`,
      remediation: "Enable S3 Block Public Access and remove any public ACL grants or policy statements.",
    });
  }

  if (resource.service === "EBS_VOLUME" && resource.encrypted === false) {
    findings.push({
      type: "UNENCRYPTED_EBS_VOLUME",
      severity: "HIGH",
      title: "Unencrypted EBS Volume",
      description: `Volume ${resource.resourceId} is not encrypted at rest.`,
      remediation: "Create an encrypted snapshot and migrate the volume, or recreate it with encryption enabled.",
    });
  }

  if (resource.service === "EBS_VOLUME" && resource.status === "available") {
    findings.push({
      type: "UNATTACHED_EBS_VOLUME",
      severity: "MEDIUM",
      title: "Unattached EBS Volume",
      description: `Volume ${resource.resourceId} is not attached to any instance and is still being billed.`,
      remediation: "Delete the volume if it's no longer needed, or attach it to an instance.",
    });
  }

  if (resource.service === "EC2_INSTANCE" && resource.status === "running") {
    const hasConfidentData =
      resource.cpuUtilizationAvgPercent !== null &&
      resource.cpuUtilizationDatapointCount >= MIN_CPU_DATAPOINTS_FOR_CONFIDENCE;

    if (hasConfidentData && resource.cpuUtilizationAvgPercent! < UNDERUTILIZED_CPU_THRESHOLD_PERCENT) {
      findings.push({
        type: "UNDERUTILIZED_EC2_INSTANCE",
        severity: "MEDIUM",
        title: "Underutilized EC2 Instance",
        description: `Instance ${resource.resourceId} averaged ${resource.cpuUtilizationAvgPercent!.toFixed(1)}% CPU over the last 14 days.`,
        remediation: "Consider downsizing the instance type or stopping it if it's no longer needed.",
      });

      if (isLargeInstanceType(resource.instanceType)) {
        findings.push({
          type: "OVER_PROVISIONED_EC2_INSTANCE",
          severity: "MEDIUM",
          title: "Over-Provisioned EC2 Instance",
          description: `Instance ${resource.resourceId} (${resource.instanceType}) is a large instance type with low utilization.`,
          remediation: "Right-size to a smaller instance type based on actual utilization.",
        });
      }
    }
  }

  if (TAGGABLE_SERVICE_TYPES.has(resource.service) && Object.keys(resource.tags).length === 0) {
    findings.push({
      type: "MISSING_TAGS",
      severity: "LOW",
      title: "Missing Tags",
      description: `${resource.name ?? resource.resourceId} has no tags, making cost allocation and ownership tracking harder.`,
      remediation: "Add at least an Environment and Owner tag.",
    });
  }

  return findings;
}
