// Shared motion primitives for components/motion/*.
//
// Durations are in seconds (not ms) because motion's `transition={{ duration }}`
// expects seconds. Keep these in sync with the design system's duration scale:
// instant 100ms, fast 150ms, base 200ms, slow 300ms, stage 400ms.
export const durations = {
  instant: 0.1,
  fast: 0.15,
  base: 0.2,
  slow: 0.3,
  stage: 0.4,
} as const;

// Matches the CSS easing used elsewhere in the app: cubic-bezier(0.16, 1, 0.3, 1).
export const easing = [0.16, 1, 0.3, 1] as const;
