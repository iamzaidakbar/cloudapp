import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  APP_DATABASE_URL: z.string().min(1, "APP_DATABASE_URL is required"),
  // Jobs don't use sessions; allow a placeholder when JOB_TYPE is set so
  // terraform/apply/rollback containers can boot without SESSION_SECRET.
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters")
    .optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_SESSION_TOKEN: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_COST_EXPLORER_ENABLED: z.string().optional(),
  GCP_BILLING_API_KEY: z.string().optional(),
  GCP_PROJECT_ID: z.string().optional(),
  JOB_RUNTIME: z.enum(["inline", "pubsub", "k8s-job"]).optional(),
  PUBSUB_TOPIC_PREFIX: z.string().optional(),
  TERRAFORM_JOB_IMAGE: z.string().optional(),
  K8S_NAMESPACE: z.string().optional(),
});

const parsed = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  APP_DATABASE_URL: process.env.APP_DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_SESSION_TOKEN: process.env.AWS_SESSION_TOKEN,
  AWS_REGION: process.env.AWS_REGION,
  AWS_COST_EXPLORER_ENABLED: process.env.AWS_COST_EXPLORER_ENABLED,
  GCP_BILLING_API_KEY: process.env.GCP_BILLING_API_KEY,
  GCP_PROJECT_ID: process.env.GCP_PROJECT_ID,
  JOB_RUNTIME: process.env.JOB_RUNTIME as "inline" | "pubsub" | "k8s-job" | undefined,
  PUBSUB_TOPIC_PREFIX: process.env.PUBSUB_TOPIC_PREFIX,
  TERRAFORM_JOB_IMAGE: process.env.TERRAFORM_JOB_IMAGE,
  K8S_NAMESPACE: process.env.K8S_NAMESPACE,
});

if (!process.env.JOB_TYPE) {
  if (!parsed.SESSION_SECRET || parsed.SESSION_SECRET.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
}

export const env = {
  ...parsed,
  SESSION_SECRET:
    parsed.SESSION_SECRET ?? "job-runner-placeholder-session-secret-32ch",
};
