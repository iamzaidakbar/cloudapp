import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import type { FindingSeverity } from "@/lib/generated/prisma/client";

const SEVERITY_TONE: Record<FindingSeverity, StatusTone> = {
  CRITICAL: "danger",
  HIGH: "danger",
  MEDIUM: "warning",
  LOW: "neutral",
};

export function SeverityBadge({ severity }: { severity: FindingSeverity }) {
  return <StatusBadge tone={SEVERITY_TONE[severity]}>{severity}</StatusBadge>;
}
