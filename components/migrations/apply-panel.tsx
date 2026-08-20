"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Rocket, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import { cn } from "@/lib/utils";
import type { ApplyRunStatus } from "@/lib/generated/prisma/client";

type ApplyRun = {
  id: string;
  version: number;
  status: ApplyRunStatus;
  finishedAt: string | Date | null;
  errorMessage: string | null;
  applyOutput: string | null;
  resourcesCreated: number | null;
};

const TERMINAL_STATUSES = new Set<ApplyRunStatus>(["SUCCEEDED", "FAILED"]);
const POLL_INTERVAL_MS = 3000;

const STATUS_CLASS: Record<ApplyRunStatus, string> = {
  QUEUED: "bg-muted text-muted-foreground",
  RUNNING: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  SUCCEEDED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  FAILED: "bg-destructive/15 text-destructive",
};

export function ApplyPanel({ migrationPlanId, initialApplyRun }: { migrationPlanId: string; initialApplyRun: ApplyRun | null }) {
  const [run, setRun] = useState(initialApplyRun);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const isActive = run ? !TERMINAL_STATUSES.has(run.status) : false;

  useEffect(() => {
    if (!isActive) return;

    cancelledRef.current = false;
    const interval = setInterval(async () => {
      const response = await fetch(`/api/migrations/${migrationPlanId}/apply`);
      if (!response.ok || cancelledRef.current) return;

      const body = await response.json();
      if (!body.success || cancelledRef.current) return;

      setRun(body.data.applyRun);
      if (!body.data.applyRun || TERMINAL_STATUSES.has(body.data.applyRun.status)) {
        clearInterval(interval);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelledRef.current = true;
      clearInterval(interval);
    };
  }, [migrationPlanId, isActive]);

  async function handleExecute() {
    setIsStarting(true);
    setError(null);

    const response = await fetch(`/api/migrations/${migrationPlanId}/apply`, { method: "POST" });
    const body = await response.json();

    if (!response.ok || !body.success) {
      setError(body.error ?? "Something went wrong. Please try again.");
      setIsStarting(false);
      return;
    }

    setRun(body.data.applyRun);
    setIsStarting(false);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TriangleAlert className="size-4 text-amber-600 dark:text-amber-400" />
          <h2 className="text-sm font-semibold text-foreground">Execute Migration</h2>
        </div>
        <Button
          type="button"
          onClick={handleExecute}
          disabled={isStarting || isActive}
          className="bg-amber-600 text-white hover:bg-amber-600/90 dark:bg-amber-500 dark:hover:bg-amber-500/90"
        >
          {isStarting || isActive ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {isActive ? "Provisioning…" : "Starting…"}
            </>
          ) : (
            <>
              <Rocket className="size-4" />
              {run?.status === "SUCCEEDED" ? "Re-run Apply" : "Execute Migration"}
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        This runs a real <code className="font-mono">terraform apply</code> against your real GCP project — it creates
        actual, billable resources. Nothing is created until you click the button above.
      </p>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {run ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Apply #{run.version}</span>
            <Badge variant="outline" className={cn("border-transparent", STATUS_CLASS[run.status])}>
              {run.status}
            </Badge>
            {run.finishedAt ? (
              <span>
                · Finished <FormattedDateTime value={run.finishedAt} />
              </span>
            ) : null}
          </div>

          {run.errorMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{run.errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          {run.status === "SUCCEEDED" ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              {run.resourcesCreated ?? 0} resource{run.resourcesCreated === 1 ? "" : "s"} provisioned for real — see the
              resource table above for each one&apos;s live GCP identifier.
            </p>
          ) : null}

          {run.applyOutput ? (
            <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs">{run.applyOutput}</pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
