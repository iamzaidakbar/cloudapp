import { FadeIn } from "@/components/motion/fade-in";

// Per-item stagger wrapper for server-rendered lists. There is no list
// wrapper component here on purpose — the parent list is rendered as a batch
// on the server, so each item just needs to know its own index.
const MAX_STAGGER_STEPS = 10;

export function StaggerItem({
  index,
  stepMs = 40,
  children,
  className,
}: {
  index: number;
  stepMs?: number;
  children: React.ReactNode;
  className?: string;
}) {
  const delayMs = Math.min(index, MAX_STAGGER_STEPS) * stepMs;

  return (
    <FadeIn delayMs={delayMs} className={className}>
      {children}
    </FadeIn>
  );
}
