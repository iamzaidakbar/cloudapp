import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// AWS status strings vary per service (running/stopped, available/in-use,
// active/inactive...) — unlike ConnectionStatusBadge/AuditStatusBadge, this
// isn't a small closed enum, so it's a keyword heuristic rather than a
// strict lookup table.
function classify(status: string | null): "positive" | "neutral" | "warning" | "negative" | "unknown" {
  if (!status) return "unknown";
  const value = status.toLowerCase();
  if (/(running|available|active|in-use|ok)/.test(value)) return "positive";
  if (/(stopped|stopping|inactive)/.test(value)) return "neutral";
  if (/(pending|creating|modifying|starting)/.test(value)) return "warning";
  if (/(terminated|error|failed|deleting)/.test(value)) return "negative";
  return "unknown";
}

const CLASS_MAP: Record<ReturnType<typeof classify>, string> = {
  positive: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  neutral: "bg-muted text-muted-foreground",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  negative: "bg-destructive/15 text-destructive",
  unknown: "bg-muted text-muted-foreground",
};

export function ResourceStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <Badge variant="outline" className={cn("border-transparent", CLASS_MAP[classify(status)])}>
      {status}
    </Badge>
  );
}
