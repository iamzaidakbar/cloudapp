import { cn } from "@/lib/utils";

// Server-safe fade-in — pure CSS (tw-animate-css), no motion import and no
// hooks, so it can be used directly inside Server Components.
export function FadeIn({
  children,
  className,
  delayMs = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}) {
  return (
    <div
      className={cn("animate-in fade-in duration-200", className)}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}
