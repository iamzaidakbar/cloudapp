import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  children?: ReactNode;
};

export function EmptyState({ icon: Icon, title, description, className, children }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-glass-strong supports-backdrop-filter:bg-glass supports-backdrop-filter:backdrop-blur-md ring-1 ring-glass-border shadow-glass px-6 py-10 text-center",
        className,
      )}
    >
      <Icon className="size-6 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {children}
    </div>
  );
}
