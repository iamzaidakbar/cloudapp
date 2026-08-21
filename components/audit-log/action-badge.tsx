import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ADMIN_ACTION_LABEL, type AdminActionTypeValue } from "@/lib/audit-log-shared";

// Colors grouped by real-world stakes — matches the choices JobTypeBadge
// already made for the overlapping concepts (Terraform/Apply/Verification/
// Rollback), so the same action reads the same color across both pages.
const ACTION_CLASS: Record<AdminActionTypeValue, string> = {
  LOGIN_SUCCEEDED: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  LOGIN_FAILED: "bg-destructive/15 text-destructive",
  LOGOUT: "bg-muted text-muted-foreground",
  TENANT_CREATED: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  AWS_CONNECTION_UPDATED: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  AWS_CONNECTION_VERIFIED: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  AUDIT_STARTED: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  COMPARISON_STARTED: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  MIGRATION_PLAN_CREATED: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  MIGRATION_APPROVED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  MIGRATION_CANCELLED: "bg-muted text-muted-foreground",
  TERRAFORM_GENERATED: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  MIGRATION_APPLIED: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  VERIFICATION_RUN: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
  MIGRATION_ROLLED_BACK: "bg-destructive/15 text-destructive",
};

export function ActionBadge({ action }: { action: AdminActionTypeValue }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", ACTION_CLASS[action])}>
      {ADMIN_ACTION_LABEL[action]}
    </Badge>
  );
}
