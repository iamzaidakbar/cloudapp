import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FindingSeverity } from "@/lib/generated/prisma/client";

const SEVERITY_CLASS: Record<FindingSeverity, string> = {
  CRITICAL: "bg-destructive/15 text-destructive",
  HIGH: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  MEDIUM: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  LOW: "bg-muted text-muted-foreground",
};

export function SeverityBadge({ severity }: { severity: FindingSeverity }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", SEVERITY_CLASS[severity])}>
      {severity}
    </Badge>
  );
}
