"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";

type RunAuditButtonProps = {
  hasActiveRun: boolean;
  activeRunStartedAt?: string | Date | null;
};

export function RunAuditButton({ hasActiveRun, activeRunStartedAt }: RunAuditButtonProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (hasActiveRun || isStarting) return;

    setIsStarting(true);
    setError(null);

    const response = await fetch("/api/audits", { method: "POST" });
    const body = await response.json();

    if (!response.ok || !body.success) {
      setError(body.error ?? "Something went wrong. Please try again.");
      setIsStarting(false);
      return;
    }

    router.push(`/audits/${body.data.auditRun.id}`);
  }

  const button = (
    <Button
      type="button"
      onClick={handleClick}
      aria-disabled={hasActiveRun || isStarting}
      className={hasActiveRun ? "pointer-events-none opacity-50" : undefined}
    >
      {isStarting ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Starting…
        </>
      ) : (
        <>
          <Play className="size-4" />
          Run Audit
        </>
      )}
    </Button>
  );

  return (
    <div className="flex flex-col items-end gap-2">
      {hasActiveRun ? (
        <Tooltip>
          <TooltipTrigger render={button} />
          <TooltipContent>
            An audit is already in progress
            {activeRunStartedAt ? (
              <>
                {" "}
                — started <FormattedDateTime value={activeRunStartedAt} />
              </>
            ) : null}
            .
          </TooltipContent>
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
