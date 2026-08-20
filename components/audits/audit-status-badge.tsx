import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { JobStatus } from "@/lib/generated/prisma/client";

const STATUS_LABEL: Record<JobStatus, string> = {
  QUEUED: "Queued",
  RUNNING: "Running",
  SUCCEEDED: "Succeeded",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

const STATUS_CLASS: Record<JobStatus, string> = {
  QUEUED: "bg-muted text-muted-foreground",
  RUNNING: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  SUCCEEDED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  FAILED: "bg-destructive/15 text-destructive",
  CANCELLED: "bg-muted text-muted-foreground",
};

export function AuditStatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", STATUS_CLASS[status])}>
      {status === "RUNNING" ? (
        <span className="size-1.5 animate-pulse rounded-full bg-blue-500" />
      ) : null}
      {STATUS_LABEL[status]}
    </Badge>
  );
}
