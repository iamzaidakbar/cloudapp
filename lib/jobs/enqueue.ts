import { PubSub } from "@google-cloud/pubsub";
import { getJobRuntime, topicForJobType, type JobMessage } from "@/lib/jobs/types";
import { handleJob } from "@/lib/jobs/handlers";
import { createTerraformK8sJob } from "@/lib/jobs/k8s-job";

type EnqueueOptions = {
  /** Next.js `after()` — used for inline mode so work survives the response. */
  after?: (fn: () => void) => void;
};

let pubsubClient: PubSub | null = null;

function getPubSub(): PubSub {
  if (!pubsubClient) {
    pubsubClient = new PubSub({
      projectId: process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT,
    });
  }
  return pubsubClient;
}

async function publishPubSub(job: JobMessage): Promise<void> {
  const topicName = topicForJobType(job.type);
  const data = Buffer.from(JSON.stringify(job));
  await getPubSub().topic(topicName).publishMessage({ data });
}

/**
 * Dispatch a background job according to JOB_RUNTIME / cluster detection.
 * - inline: run in-process (local dev; uses `after` when provided)
 * - pubsub: publish for the worker Deployment
 * - k8s-job: create an isolated Job (terraform/apply/rollback)
 */
export async function enqueueJob(
  job: JobMessage,
  options: EnqueueOptions = {},
): Promise<void> {
  const runtime = getJobRuntime(job.type);

  if (runtime === "pubsub") {
    await publishPubSub(job);
    return;
  }

  if (runtime === "k8s-job") {
    await createTerraformK8sJob(job);
    return;
  }

  // inline
  const run = () =>
    handleJob(job).catch((error) =>
      console.error(`[job:${job.type}] failed unexpectedly:`, error),
    );

  if (options.after) {
    options.after(run);
  } else {
    void run();
  }
}
