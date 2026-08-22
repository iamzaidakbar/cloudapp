import "dotenv/config";
import { PubSub, type Message } from "@google-cloud/pubsub";
import { handleJob } from "@/lib/jobs/handlers";
import {
  subscriptionForJobType,
  type AppJobType,
  type JobMessage,
} from "@/lib/jobs/types";

const TYPES: AppJobType[] = ["AUDIT", "COMPARISON"];

function parseMessage(data: Buffer): JobMessage {
  const parsed = JSON.parse(data.toString("utf8")) as JobMessage;
  if (!parsed?.type || !parsed?.tenantId || !parsed?.runId) {
    throw new Error("Invalid job message payload");
  }
  return parsed;
}

async function processMessage(message: Message): Promise<void> {
  try {
    const job = parseMessage(message.data);
    console.log(`[worker] start ${job.type} run=${job.runId} tenant=${job.tenantId}`);
    await handleJob(job);
    message.ack();
    console.log(`[worker] done ${job.type} run=${job.runId}`);
  } catch (error) {
    console.error("[worker] job failed:", error);
    message.nack();
  }
}

async function main() {
  // One-shot mode for Terraform Jobs: env vars set by the Job template.
  const oneShotType = process.env.JOB_TYPE as AppJobType | undefined;
  const oneShotRunId = process.env.JOB_RUN_ID;
  const oneShotTenantId = process.env.JOB_TENANT_ID;
  if (oneShotType && oneShotRunId && oneShotTenantId) {
    await handleJob({
      type: oneShotType,
      runId: oneShotRunId,
      tenantId: oneShotTenantId,
      migrationPlanId: process.env.JOB_MIGRATION_PLAN_ID,
      rdsCredentialsSecret: process.env.JOB_RDS_CREDENTIALS_SECRET?.trim() || undefined,
    });
    return;
  }

  const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    throw new Error("GCP_PROJECT_ID (or GOOGLE_CLOUD_PROJECT) is required for the Pub/Sub worker");
  }

  const pubsub = new PubSub({ projectId });
  console.log(`[worker] listening on project=${projectId}`);

  for (const type of TYPES) {
    const name = subscriptionForJobType(type);
    const subscription = pubsub.subscription(name);
    subscription.on("message", (message) => {
      void processMessage(message);
    });
    subscription.on("error", (error) => {
      console.error(`[worker] subscription ${name} error:`, error);
    });
    console.log(`[worker] subscribed ${name}`);
  }
}

main().catch((error) => {
  console.error("[worker] fatal:", error);
  process.exit(1);
});
