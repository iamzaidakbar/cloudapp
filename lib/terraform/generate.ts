import { createHash } from "node:crypto";
import { toGcpRegion, toGcpZone } from "@/lib/pricing/reference-data";
import type { AwsServiceType } from "@/lib/generated/prisma/client";

export type TerraformSourceResource = {
  awsService: AwsServiceType;
  awsResourceId: string;
  awsResourceName: string | null;
  region: string;
  awsSizeLabel: string | null;
  gcpSizeLabel: string | null;
  // Only meaningful (and only ever set) for RDS_INSTANCE — resolved by the
  // caller from the source AuditResource's rawConfig.Engine, since neither
  // ComparisonItem nor MigrationResource persist engine as its own column
  // (see run-terraform.ts for the lineage join that recovers it).
  rdsEngine: "mysql" | "postgres" | null;
};

// Terraform resource identifiers (the HCL label, not the cloud resource
// name) must be [a-zA-Z0-9_-]; slugify the AWS id so generated blocks stay
// traceable back to their source resource without risking invalid HCL.
// Exported so run-apply.ts can recompute the same address to match a
// MigrationResource back to its entry in the post-apply state file.
export function slug(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/^[^a-zA-Z_]/, "_$&");
}

function hcl(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((acc, str, i) => acc + str + (i < values.length ? String(values[i]) : ""), "");
}

function ec2Block(resource: TerraformSourceResource): string {
  const name = slug(resource.awsResourceId);
  const zone = toGcpZone(resource.region);
  const machineType = resource.gcpSizeLabel ?? "e2-small";

  return hcl`
resource "google_compute_instance" "${name}" {
  name         = "${name}"
  machine_type = "${machineType}"
  zone         = "${zone}"

  # Sized from the source AWS instance's real vCPU/RAM (see the Comparison
  # phase's mapping); the OS image is a reasonable default, not a claim
  # about what the source instance actually runs — this app never collects
  # the AMI's OS. Adjust before using for a real migration.
  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    network = "default"
  }
}
`.trim();
}

// GCS bucket names are globally unique across all of GCP (not just this
// project), lowercase-only, and capped at 63 characters — confirmed the
// hard way: an earlier version of this function concatenated the raw
// project ID and resource ID and `terraform validate` correctly rejected
// the result as too long. A short hash of the source resource id keeps
// this well under the limit while staying deterministic and traceable.
function gcsBucketName(projectId: string, awsResourceId: string): string {
  const hash = createHash("sha256").update(awsResourceId).digest("hex").slice(0, 10);
  const prefix = projectId
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .slice(0, 40);
  return `${prefix}-${hash}`.replace(/^-+|-+$/g, "").slice(0, 63);
}

function s3Block(resource: TerraformSourceResource, projectId: string): string {
  const label = slug(resource.awsResourceId);
  const location = toGcpRegion(resource.region).toUpperCase();
  const bucketName = gcsBucketName(projectId, resource.awsResourceId);

  return hcl`
resource "google_storage_bucket" "${label}" {
  # GCS bucket names are globally unique across all of GCP, not just this
  # project — this heuristic (project prefix + a short hash of the source
  # resource id) makes collisions unlikely, not impossible. Rename if it
  # collides.
  name          = "${bucketName}"
  location      = "${location}"
  storage_class = "STANDARD"

  # Confirmed against a real apply: many GCP orgs enforce the
  # storage.uniformBucketLevelAccess constraint by default (it's GCP's own
  # recommended posture over legacy per-object ACLs), and without this the
  # org policy rejects bucket creation outright with a 412 error.
  uniform_bucket_level_access = true
}
`.trim();
}

// AWS RDS instance classes/database_version pairs. GCP's database_version
// values are specific major-version strings (e.g. "MYSQL_8_0"); default to
// the current common major version per engine rather than trying to infer
// the source's exact minor version, which this app never collects.
const DATABASE_VERSION: Record<"mysql" | "postgres", string> = {
  mysql: "MYSQL_8_0",
  postgres: "POSTGRES_15",
};

function rdsBlock(resource: TerraformSourceResource, disableDeletionProtection: boolean): string {
  const name = slug(resource.awsResourceId);
  const region = toGcpRegion(resource.region);
  const match = resource.gcpSizeLabel?.match(/(\d+)\s*vCPU\s*\/\s*(\d+)\s*GiB/i);
  const vcpu = match ? Number.parseInt(match[1], 10) : 2;
  const memoryMb = match ? Number.parseInt(match[2], 10) * 1024 : 4096;
  const databaseVersion = resource.rdsEngine ? DATABASE_VERSION[resource.rdsEngine] : "MYSQL_8_0";

  return hcl`
resource "google_sql_database_instance" "${name}" {
  name             = "${name}"
  database_version = "${databaseVersion}"
  region           = "${region}"

  settings {
    tier = "db-custom-${vcpu}-${memoryMb}"
  }

  deletion_protection = ${!disableDeletionProtection}
}
`.trim();
}

function lambdaBlock(resource: TerraformSourceResource, projectId: string): string {
  const name = slug(resource.awsResourceId);
  const region = toGcpRegion(resource.region);
  const bucket = `${projectId}-cloudshiftg-transfer`;

  return hcl`
resource "google_cloudfunctions2_function" "${name}" {
  name     = "${name}"
  location = "${region}"

  build_config {
    runtime     = "nodejs20"
    entry_point = "handler"

    # Placeholder zip is ensured in the transfer bucket before plan/apply
    # (\`ensureLambdaPlaceholderZip\`). Data transfer replaces this with the
    # real Lambda package after Apply.
    source {
      storage_source {
        bucket = "${bucket}"
        object = "placeholders/lambda-stub.zip"
      }
    }
  }

  service_config {
    max_instance_count = 10
    available_memory    = "256M"
    timeout_seconds      = 60
  }
}
`.trim();
}

export function generateTerraformConfig(
  resources: TerraformSourceResource[],
  projectId: string,
  options: { disableDeletionProtection?: boolean } = {},
): string {
  const defaultRegion = resources[0] ? toGcpRegion(resources[0].region) : "us-central1";

  const header = hcl`
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# Authenticates via Application Default Credentials (\`gcloud auth
# application-default login\`) picked up automatically — no service-account
# key file is generated, referenced, or required.
provider "google" {
  project = "${projectId}"
  region  = "${defaultRegion}"
}
`.trim();

  const blocks = resources.map((resource) => {
    switch (resource.awsService) {
      case "EC2_INSTANCE":
        return ec2Block(resource);
      case "S3_BUCKET":
        return s3Block(resource, projectId);
      case "RDS_INSTANCE":
        return rdsBlock(resource, options.disableDeletionProtection ?? false);
      case "LAMBDA_FUNCTION":
        return lambdaBlock(resource, projectId);
      default:
        return `# Skipped ${resource.awsResourceId} (${resource.awsService}) — no Terraform mapping for this service.`;
    }
  });

  return [header, ...blocks].join("\n\n") + "\n";
}
