import { cn } from "@/lib/utils";
import { RUN_STATUS_CLASS, RUN_STATUS_LABEL } from "@/lib/run-status";
import { StatusBadge } from "@/components/shared/status-badge";
import type { JobRowStatus } from "@/lib/jobs";

export function JobStatusBadge({ status }: { status: JobRowStatus }) {
  return (
    <StatusBadge
      pulse={status === "RUNNING"}
      uniform
      className={cn(RUN_STATUS_CLASS[status])}
    >
      {RUN_STATUS_LABEL[status]}
    </StatusBadge>
  );
}
