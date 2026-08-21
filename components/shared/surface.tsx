import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SurfaceProps = {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
};

export function Surface({
  children,
  className,
  as: Comp = "div",
}: SurfaceProps) {
  return (
    <Comp
      className={cn(
        "rounded-none border border-border bg-card text-card-foreground",
        className,
      )}
    >
      {children}
    </Comp>
  );
}
