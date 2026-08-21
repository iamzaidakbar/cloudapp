import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FilterBarProps = {
  children: ReactNode;
  className?: string;
};

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end gap-3 border border-border bg-card p-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
