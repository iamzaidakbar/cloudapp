import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/motion/fade-in";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  children?: ReactNode;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
  children,
}: EmptyStateProps) {
  return (
    <FadeIn>
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 border border-dashed border-border bg-card px-6 py-12 text-center",
          className,
        )}
      >
        <div className="flex size-10 items-center justify-center border border-border bg-muted">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description ? (
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {children}
      </div>
    </FadeIn>
  );
}
