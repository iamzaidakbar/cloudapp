import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RUN_STATUS_CLASS, RUN_STATUS_LABEL } from "@/lib/run-status";
import type { JobRowStatus } from "@/lib/jobs";

export function JobStatusBadge({ status }: { status: JobRowStatus }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", RUN_STATUS_CLASS[status])}>
      {status === "RUNNING" ? <span className="size-1.5 animate-pulse rounded-full bg-blue-500" /> : null}
      {RUN_STATUS_LABEL[status]}
    </Badge>
  );
}
