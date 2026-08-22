import * as k8s from "@kubernetes/client-node";
import type { RdsCredential } from "@/lib/transfer/rds-credentials";
import { TRANSFER_RDS_CREDENTIALS_ENV } from "@/lib/transfer/rds-credentials";

function getKubeConfig(): k8s.KubeConfig {
  const kc = new k8s.KubeConfig();
  try {
    kc.loadFromCluster();
  } catch {
    kc.loadFromDefault();
  }
  return kc;
}

function namespace(): string {
  return (
    process.env.K8S_NAMESPACE?.trim() ||
    process.env.POD_NAMESPACE?.trim() ||
    "development"
  );
}

export function transferRdsSecretName(runId: string): string {
  return `transfer-rds-${runId.slice(0, 8)}-${Date.now().toString(36).slice(-4)}`.slice(
    0,
    63,
  );
}

/** Short-lived Secret holding RDS passwords for a DATA_TRANSFER Job (not stored in Postgres). */
export async function createRdsCredentialsSecret(
  runId: string,
  credentials: RdsCredential[],
): Promise<string> {
  const kc = getKubeConfig();
  const core = kc.makeApiClient(k8s.CoreV1Api);
  const name = transferRdsSecretName(runId);
  const ns = namespace();

  await core.createNamespacedSecret({
    namespace: ns,
    body: {
      apiVersion: "v1",
      kind: "Secret",
      metadata: {
        name,
        namespace: ns,
        labels: {
          app: "cloudshiftg",
          "cloudshiftg/purpose": "transfer-rds",
          "cloudshiftg/run-id": runId.slice(0, 63),
        },
      },
      type: "Opaque",
      stringData: {
        [TRANSFER_RDS_CREDENTIALS_ENV]: JSON.stringify(credentials),
      },
    },
  });

  return name;
}

export async function deleteRdsCredentialsSecret(secretName: string): Promise<void> {
  const kc = getKubeConfig();
  const core = kc.makeApiClient(k8s.CoreV1Api);
  const ns = namespace();
  try {
    await core.deleteNamespacedSecret({ name: secretName, namespace: ns });
  } catch (error: unknown) {
    const status = (error as { response?: { statusCode?: number } })?.response?.statusCode;
    if (status === 404) return;
    throw error;
  }
}
