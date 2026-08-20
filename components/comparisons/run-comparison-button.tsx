"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";

type RunComparisonButtonProps = {
  hasActiveRun: boolean;
  activeRunStartedAt?: string | Date | null;
  hasSuccessfulAudit: boolean;
};

export function RunComparisonButton({ hasActiveRun, activeRunStartedAt, hasSuccessfulAudit }: RunComparisonButtonProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = hasActiveRun || isStarting || !hasSuccessfulAudit;

  async function handleClick() {
    if (disabled) return;

    setIsStarting(true);
    setError(null);

    const response = await fetch("/api/comparisons", { method: "POST" });
    const body = await response.json();

    if (!response.ok || !body.success) {
      setError(body.error ?? "Something went wrong. Please try again.");
      setIsStarting(false);
      return;
    }

    router.push(`/comparisons/${body.data.comparisonRun.id}`);
  }

  const button = (
    <Button type="button" onClick={handleClick} aria-disabled={disabled} className={disabled ? "pointer-events-none opacity-50" : undefined}>
      {isStarting ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Starting…
        </>
      ) : (
        <>
          <GitCompare className="size-4" />
          Run Comparison
        </>
      )}
    </Button>
  );

  const tooltipText = !hasSuccessfulAudit ? (
    "Run a successful audit first"
  ) : hasActiveRun ? (
    <>
      A comparison is already in progress
      {activeRunStartedAt ? (
        <>
          {" "}
          — started <FormattedDateTime value={activeRunStartedAt} />
        </>
      ) : null}
      .
    </>
  ) : null;

  return (
    <div className="flex flex-col items-end gap-2">
      {disabled && !isStarting ? (
        <Tooltip>
          <TooltipTrigger render={button} />
          <TooltipContent>{tooltipText}</TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
      {error ? (
        <Alert variant="destructive" className="max-w-sm">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
