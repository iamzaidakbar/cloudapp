import { StatusBadge } from "@/components/shared/status-badge";
import type { JobType } from "@/lib/jobs";

const TYPE_LABEL: Record<JobType, string> = {
  AUDIT: "Audit",
  COMPARISON: "Comparison",
  TERRAFORM: "Terraform",
  APPLY: "Apply",
  VERIFICATION: "Verification",
  DATA_TRANSFER: "Data transfer",
  ROLLBACK: "Rollback",
};

export function JobTypeBadge({ type }: { type: JobType }) {
  return (
    <StatusBadge tone={type === "ROLLBACK" ? "danger" : "neutral"}>
      {TYPE_LABEL[type]}
    </StatusBadge>
  );
}
