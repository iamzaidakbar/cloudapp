"use client";

import { AnimatePresence, motion } from "motion/react";
import { durations } from "@/components/motion/tokens";

// Crossfades a status badge only when the status VALUE actually changes.
// `statusKey` is passed straight through as the AnimatePresence key, so
// components that poll every few seconds and re-render on every tick (even
// when the status is unchanged) do not replay the animation — React only
// swaps the keyed child, and therefore only triggers exit/enter, when
// `statusKey` itself changes.
export function StatusTransition({
  statusKey,
  children,
  className,
}: {
  statusKey: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={statusKey}
        className={className}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: durations.fast }}
      >
        {children}
      </motion.span>
    </AnimatePresence>
  );
}
