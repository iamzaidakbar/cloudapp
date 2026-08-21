"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { durations, easing } from "@/components/motion/tokens";

const STEPS = ["Organization", "AWS Role", "Verify Connection", "Complete"];

export function StepIndicator({ step }: { step: number }) {
  return (
    <ol className="mb-8 grid grid-cols-4 gap-2">
      {STEPS.map((label, index) => {
        const stepNumber = index + 1;
        const isComplete = stepNumber < step;
        const isActive = stepNumber === step;

        return (
          <li key={label} className="flex flex-col gap-1.5">
            {isActive ? (
              <motion.div
                layoutId="onboarding-step-active"
                className="h-0.5 bg-foreground"
                transition={{ duration: durations.base, ease: easing }}
              />
            ) : (
              <div
                className={cn(
                  "h-0.5",
                  isComplete ? "bg-foreground" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "text-[11px] font-medium uppercase tracking-wide",
                isActive ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {stepNumber}. {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
