import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import type { ConnectionStatus } from "@/lib/generated/prisma/client";

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  CONNECTED: "Connected",
  NOT_CONNECTED: "Not Connected",
  FAILED: "Failed",
};

const STATUS_TONE: Record<ConnectionStatus, StatusTone> = {
  CONNECTED: "success",
  NOT_CONNECTED: "neutral",
  FAILED: "danger",
};

export function ConnectionStatusBadge({
  status,
}: {
  status: ConnectionStatus;
}) {
  return (
    <StatusBadge tone={STATUS_TONE[status]} pulse={status === "CONNECTED"}>
      {STATUS_LABEL[status]}
    </StatusBadge>
  );
}
