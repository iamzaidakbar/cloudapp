import { cn } from "@/lib/utils";

const STEPS = ["Organization", "AWS Role", "Verify Connection", "Complete"];

export function StepIndicator({ step }: { step: number }) {
  return (
    <ol className="mb-6 grid grid-cols-4 gap-2">
      {STEPS.map((label, index) => {
        const stepNumber = index + 1;
        const isComplete = stepNumber < step;
        const isActive = stepNumber === step;

        return (
          <li key={label} className="flex flex-col gap-1.5">
            <div
              className={cn(
                "h-1 rounded-full",
                isComplete || isActive ? "bg-primary" : "bg-border",
              )}
            />
            <span
              className={cn(
                "text-xs font-medium",
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
