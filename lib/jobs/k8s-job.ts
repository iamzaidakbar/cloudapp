import * as k8s from "@kubernetes/client-node";
import type { JobMessage } from "@/lib/jobs/types";

/**
 * Create a tenant-isolated Kubernetes Job for terraform / apply / rollback.
 * Requires in-cluster config (or KUBECONFIG) and JOB_IMAGE / namespace env.
 */
export async function createTerraformK8sJob(job: JobMessage): Promise<void> {
  if (job.type !== "TERRAFORM" && job.type !== "APPLY" && job.type !== "ROLLBACK") {
    throw new Error(`k8s-job runtime does not support ${job.type}`);
  }

  const namespace =
    process.env.K8S_NAMESPACE?.trim() ||
    process.env.POD_NAMESPACE?.trim() ||
    "development";
  const image =
    process.env.TERRAFORM_JOB_IMAGE?.trim() ||
    process.env.JOB_IMAGE?.trim();
  if (!image) {
    throw new Error("TERRAFORM_JOB_IMAGE (or JOB_IMAGE) is required for k8s-job runtime");
  }

  const kc = new k8s.KubeConfig();
  try {
    kc.loadFromCluster();
  } catch {
    kc.loadFromDefault();
  }

  const batch = kc.makeApiClient(k8s.BatchV1Api);
  const name = `${job.type.toLowerCase()}-${job.runId.slice(0, 8)}-${Date.now()
    .toString(36)
    .slice(-4)}`.slice(0, 63);

  const serviceAccount =
    process.env.TERRAFORM_JOB_SERVICE_ACCOUNT?.trim() || "cloudshiftg-terraform-job";
  const cloudSqlInstance =
    process.env.CLOUDSQL_INSTANCE_CONNECTION_NAME?.trim() || "";
  const cloudSqlProxyImage =
    process.env.CLOUDSQL_PROXY_IMAGE?.trim() ||
    "gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.14.3";

  const mainContainer: k8s.V1Container = {
    name: "terraform-job",
    image,
    env: [
      { name: "JOB_TYPE", value: job.type },
      { name: "JOB_RUN_ID", value: job.runId },
      { name: "JOB_TENANT_ID", value: job.tenantId },
      ...(job.migrationPlanId
        ? [{ name: "JOB_MIGRATION_PLAN_ID", value: job.migrationPlanId }]
        : []),
      { name: "GCP_PROJECT_ID", value: process.env.GCP_PROJECT_ID ?? "" },
      {
        name: "APP_DATABASE_URL",
        valueFrom: {
          secretKeyRef: {
            name: "cloudshiftg-secrets",
            key: "APP_DATABASE_URL",
            optional: true,
          },
        },
      },
      {
        name: "DATABASE_URL",
        valueFrom: {
          secretKeyRef: {
            name: "cloudshiftg-secrets",
            key: "DATABASE_URL",
            optional: true,
          },
        },
      },
    ],
    resources: {
      requests: { cpu: "250m", memory: "512Mi" },
      limits: { cpu: "1", memory: "2Gi" },
    },
  };

  // Native sidecar (restartPolicy Always) so the Job completes when terraform-job exits.
  // DB URLs use 127.0.0.1:5432 (Secret Manager proxy form), same as Helm web/worker.
  const initContainers: k8s.V1Container[] = [];
  if (cloudSqlInstance) {
    initContainers.push({
      name: "cloud-sql-proxy",
      image: cloudSqlProxyImage,
      imagePullPolicy: "IfNotPresent",
      args: ["--structured-logs", "--private-ip", "--port=5432", cloudSqlInstance],
      restartPolicy: "Always",
      securityContext: {
        runAsNonRoot: true,
        allowPrivilegeEscalation: false,
        capabilities: { drop: ["ALL"] },
      },
      resources: {
        requests: { cpu: "50m", memory: "64Mi" },
        limits: { cpu: "250m", memory: "128Mi" },
      },
    } as k8s.V1Container);
  }

  await batch.createNamespacedJob({
    namespace,
    body: {
      apiVersion: "batch/v1",
      kind: "Job",
      metadata: {
        name,
        namespace,
        labels: {
          app: "cloudshiftg",
          "cloudshiftg/job-type": job.type.toLowerCase(),
          "cloudshiftg/tenant-id": job.tenantId.slice(0, 63),
          "cloudshiftg/run-id": job.runId.slice(0, 63),
          ...(job.migrationPlanId
            ? { "cloudshiftg/migration-plan-id": job.migrationPlanId.slice(0, 63) }
            : {}),
        },
      },
      spec: {
        ttlSecondsAfterFinished: 3600,
        backoffLimit: 0,
        template: {
          metadata: {
            labels: {
              app: "cloudshiftg-terraform-job",
              "cloudshiftg/job-type": job.type.toLowerCase(),
              "cloudshiftg/tenant-id": job.tenantId.slice(0, 63),
            },
          },
          spec: {
            serviceAccountName: serviceAccount,
            restartPolicy: "Never",
            initContainers: initContainers.length ? initContainers : undefined,
            containers: [mainContainer],
          },
        },
      },
    },
  });
}
