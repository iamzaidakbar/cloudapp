import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ConnectionStatus } from "@/lib/generated/prisma/client";

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  CONNECTED: "Connected",
  NOT_CONNECTED: "Not Connected",
  FAILED: "Failed",
};

const STATUS_CLASS: Record<ConnectionStatus, string> = {
  CONNECTED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  NOT_CONNECTED: "bg-muted text-muted-foreground",
  FAILED: "bg-destructive/15 text-destructive",
};

export function ConnectionStatusBadge({ status }: { status: ConnectionStatus }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", STATUS_CLASS[status])}>
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "CONNECTED" && "bg-emerald-500",
          status === "NOT_CONNECTED" && "bg-muted-foreground/50",
          status === "FAILED" && "bg-destructive",
        )}
      />
      {STATUS_LABEL[status]}
    </Badge>
  );
}
