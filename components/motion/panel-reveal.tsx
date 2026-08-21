"use client";

import { motion } from "motion/react";
import { durations, easing } from "@/components/motion/tokens";

// Mount-only reveal for panels that, once shown, stay mounted — no exit
// animation is needed.
export function PanelReveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: durations.slow, ease: easing }}
    >
      {children}
    </motion.div>
  );
}
