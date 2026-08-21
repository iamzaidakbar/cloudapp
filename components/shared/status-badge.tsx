import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type StatusTone = "neutral" | "active" | "success" | "warning" | "danger";

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  active: "border-foreground/30 bg-foreground/10 text-foreground",
  success: "border-foreground/40 bg-foreground text-background",
  warning: "border-border bg-secondary text-secondary-foreground",
  danger: "border-destructive/40 bg-destructive/10 text-destructive",
};

type StatusBadgeProps = {
  tone?: StatusTone;
  children: ReactNode;
  className?: string;
  pulse?: boolean;
};

export function StatusBadge({
  tone = "neutral",
  children,
  className,
  pulse,
}: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "normal-case tracking-normal",
        TONE_CLASS[tone],
        className,
      )}
    >
      {pulse ? (
        <span className="size-1.5 animate-pulse rounded-none bg-current" />
      ) : null}
      {children}
    </Badge>
  );
}
