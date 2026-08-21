import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import type { MigrationPlanStatus } from "@/lib/generated/prisma/client";

const STATUS_LABEL: Record<MigrationPlanStatus, string> = {
  DRAFT: "Draft",
  APPROVED: "Approved",
  CANCELLED: "Cancelled",
  ROLLED_BACK: "Rolled Back",
};

const STATUS_TONE: Record<MigrationPlanStatus, StatusTone> = {
  DRAFT: "neutral",
  APPROVED: "success",
  CANCELLED: "danger",
  ROLLED_BACK: "neutral",
};

export function MigrationStatusBadge({
  status,
}: {
  status: MigrationPlanStatus;
}) {
  return (
    <StatusBadge tone={STATUS_TONE[status]} uniform>
      {STATUS_LABEL[status]}
    </StatusBadge>
  );
}
