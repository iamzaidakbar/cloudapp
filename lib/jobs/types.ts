export type AppJobType =
  | "AUDIT"
  | "COMPARISON"
  | "TERRAFORM"
  | "APPLY"
  | "ROLLBACK";

export type JobMessage = {
  type: AppJobType;
  tenantId: string;
  runId: string;
  migrationPlanId?: string;
};

/** How background work is dispatched. */
export type JobRuntime = "inline" | "pubsub" | "k8s-job";

export function getJobRuntime(type: AppJobType): JobRuntime {
  const override = process.env.JOB_RUNTIME?.trim().toLowerCase();
  if (override === "inline" || override === "pubsub" || override === "k8s-job") {
    // Terraform family always uses k8s-job when that mode is selected;
    // audits/comparisons use pubsub when JOB_RUNTIME=pubsub.
    if (override === "k8s-job") {
      return type === "AUDIT" || type === "COMPARISON" ? "pubsub" : "k8s-job";
    }
    if (override === "pubsub") {
      return type === "AUDIT" || type === "COMPARISON" ? "pubsub" : "inline";
    }
    return "inline";
  }

  // Sensible defaults by environment
  if (process.env.KUBERNETES_SERVICE_HOST) {
    return type === "AUDIT" || type === "COMPARISON" ? "pubsub" : "k8s-job";
  }
  return "inline";
}

export function topicForJobType(type: AppJobType): string {
  const prefix = process.env.PUBSUB_TOPIC_PREFIX?.trim() || "cloudshiftg";
  switch (type) {
    case "AUDIT":
      return `${prefix}-audit-jobs`;
    case "COMPARISON":
      return `${prefix}-comparison-jobs`;
    default:
      return `${prefix}-migration-jobs`;
  }
}

export function subscriptionForJobType(type: AppJobType): string {
  return `${topicForJobType(type)}-worker`;
}
