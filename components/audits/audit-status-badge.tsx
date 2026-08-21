import { cn } from "@/lib/utils";
import { RUN_STATUS_CLASS, RUN_STATUS_LABEL } from "@/lib/run-status";
import { StatusBadge } from "@/components/shared/status-badge";
import type { JobStatus } from "@/lib/generated/prisma/client";

export function AuditStatusBadge({ status }: { status: JobStatus }) {
  return (
    <StatusBadge
      pulse={status === "RUNNING"}
      className={cn(RUN_STATUS_CLASS[status])}
    >
      {RUN_STATUS_LABEL[status]}
    </StatusBadge>
  );
}
