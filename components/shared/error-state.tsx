import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/motion/fade-in";

type ErrorStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
  children?: ReactNode;
};

export function ErrorState({
  title,
  description,
  icon: Icon = TriangleAlert,
  className,
  children,
}: ErrorStateProps) {
  return (
    <FadeIn>
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 border border-destructive/40 bg-destructive/5 px-6 py-10 text-center",
          className,
        )}
      >
        <div className="flex size-10 items-center justify-center border border-destructive/40 bg-destructive/10">
          <Icon className="size-5 text-destructive" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-destructive">{title}</p>
          {description ? (
            <p className="mx-auto max-w-md text-sm text-destructive/90">
              {description}
            </p>
          ) : null}
        </div>
        {children}
      </div>
    </FadeIn>
  );
}
