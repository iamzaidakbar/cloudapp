import { FlaskConical } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type DataSourceBadgeProps = {
  dataSource: "AWS" | "GCP" | "DEV_ADAPTER";
  compact?: boolean;
};

export function DataSourceBadge({
  dataSource,
  compact = false,
}: DataSourceBadgeProps) {
  if (dataSource !== "DEV_ADAPTER") return null;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <FlaskConical className="size-3.5 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent>
          Discovered via simulated dev adapter data
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <StatusBadge tone="warning">
      <FlaskConical className="size-3" />
      Simulated (Dev Adapter)
    </StatusBadge>
  );
}
