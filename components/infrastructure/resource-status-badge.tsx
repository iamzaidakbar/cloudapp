import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";

function classify(
  status: string | null,
): "positive" | "neutral" | "warning" | "negative" | "unknown" {
  if (!status) return "unknown";
  const value = status.toLowerCase();
  if (/(running|available|active|in-use|ok)/.test(value)) return "positive";
  if (/(stopped|stopping|inactive)/.test(value)) return "neutral";
  if (/(pending|creating|modifying|starting)/.test(value)) return "warning";
  if (/(terminated|error|failed|deleting)/.test(value)) return "negative";
  return "unknown";
}

const TONE_MAP: Record<ReturnType<typeof classify>, StatusTone> = {
  positive: "success",
  neutral: "neutral",
  warning: "warning",
  negative: "danger",
  unknown: "neutral",
};

export function ResourceStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;

  return <StatusBadge tone={TONE_MAP[classify(status)]}>{status}</StatusBadge>;
}
