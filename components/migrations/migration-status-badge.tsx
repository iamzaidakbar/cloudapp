import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MigrationPlanStatus } from "@/lib/generated/prisma/client";

const STATUS_LABEL: Record<MigrationPlanStatus, string> = {
  DRAFT: "Draft",
  APPROVED: "Approved",
  CANCELLED: "Cancelled",
  ROLLED_BACK: "Rolled Back",
};

const STATUS_CLASS: Record<MigrationPlanStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  APPROVED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  CANCELLED: "bg-destructive/15 text-destructive",
  ROLLED_BACK: "bg-muted text-muted-foreground",
};

export function MigrationStatusBadge({ status }: { status: MigrationPlanStatus }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", STATUS_CLASS[status])}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
