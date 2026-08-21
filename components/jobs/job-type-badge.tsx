import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { JobType } from "@/lib/jobs";

const TYPE_LABEL: Record<JobType, string> = {
  AUDIT: "Audit",
  COMPARISON: "Comparison",
  TERRAFORM: "Terraform",
  APPLY: "Apply",
  VERIFICATION: "Verification",
  ROLLBACK: "Rollback",
};

const TYPE_CLASS: Record<JobType, string> = {
  AUDIT: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  COMPARISON: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  TERRAFORM: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  APPLY: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  VERIFICATION: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
  ROLLBACK: "bg-destructive/15 text-destructive",
};

export function JobTypeBadge({ type }: { type: JobType }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", TYPE_CLASS[type])}>
      {TYPE_LABEL[type]}
    </Badge>
  );
}
