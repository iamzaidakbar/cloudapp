import { FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type DataSourceBadgeProps = {
  dataSource: "AWS" | "GCP" | "DEV_ADAPTER";
  compact?: boolean;
};

export function DataSourceBadge({ dataSource, compact = false }: DataSourceBadgeProps) {
  if (dataSource !== "DEV_ADAPTER") return null;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <FlaskConical className="size-3.5 text-amber-500" />
        </TooltipTrigger>
        <TooltipContent>Discovered via simulated dev adapter data</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Badge variant="outline" className="border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400">
      <FlaskConical className="size-3" />
      Simulated (Dev Adapter)
    </Badge>
  );
}
