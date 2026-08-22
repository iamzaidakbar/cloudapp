"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Rocket, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PanelReveal } from "@/components/motion/panel-reveal";
import { StatusTransition } from "@/components/motion/status-transition";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import { cn } from "@/lib/utils";
import { RUN_STATUS_CLASS } from "@/lib/run-status";
import type { ApplyRunStatus } from "@/lib/generated/prisma/client";

export type ApplyRunSummary = {
  id: string;
  version: number;
  status: ApplyRunStatus;
  finishedAt: string | Date | null;
  errorMessage: string | null;
  applyOutput: string | null;
  resourcesCreated: number | null;
};

const TERMINAL_STATUSES = new Set<ApplyRunStatus>(["SUCCEEDED", "FAILED"]);
const POLL_INTERVAL_MS = 2500;

export function ApplyPanel({
  migrationPlanId,
  initialApplyRun,
  onRunChange,
}: {
  migrationPlanId: string;
  initialApplyRun: ApplyRunSummary | null;
  onRunChange?: (run: ApplyRunSummary | null) => void;
}) {
  const [run, setRun] = useState(initialApplyRun);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onRunChangeRef = useRef(onRunChange);
  onRunChangeRef.current = onRunChange;

  const isActive = Boolean(run && !TERMINAL_STATUSES.has(run.status));

  function commitRun(next: ApplyRunSummary | null) {
    setRun(next);
    onRunChangeRef.current?.(next);
  }

  useEffect(() => {
    if (!isActive) return;

    let cancelled = false;

    async function poll() {
      try {
        const response = await fetch(`/api/migrations/${migrationPlanId}/apply`, {
          cache: "no-store",
        });
        if (!response.ok || cancelled) return;

        const body = await response.json();
        if (!body.success || cancelled) return;

        commitRun(body.data.applyRun);
      } catch {
        // Transient network errors — retry on the next interval.
      }
    }

    void poll();
    const interval = setInterval(() => void poll(), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [migrationPlanId, isActive, run?.id]);

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

    commitRun(body.data.applyRun);
    setIsStarting(false);
  }

  return (
    <PanelReveal>
      <section className="border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 md:px-5">
          <div className="flex flex-col gap-0.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <TriangleAlert className="size-3.5 text-foreground" />
              Execute migration
            </h2>
            <p className="text-xs text-muted-foreground">
              Runs a real terraform apply against your GCP project
            </p>
          </div>
          <Button type="button" onClick={handleExecute} disabled={isStarting || isActive}>
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

        <div className="flex flex-col gap-3 p-4 md:p-5">
          <p className="text-xs text-muted-foreground">
            This runs a real <code className="font-mono">terraform apply</code> against your real GCP
            project — it creates actual, billable resources. Nothing is created until you click the
            button above.
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
                <StatusTransition statusKey={run.status}>
                  <Badge
                    variant="outline"
                    className={cn("border-transparent", RUN_STATUS_CLASS[run.status])}
                  >
                    {run.status}
                  </Badge>
                </StatusTransition>
                {isActive ? (
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <Loader2 className="size-3 animate-spin" />
                    Updating live…
                  </span>
                ) : null}
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
                <p className="text-sm text-foreground">
                  {run.resourcesCreated ?? 0} resource
                  {run.resourcesCreated === 1 ? "" : "s"} provisioned for real — see the resource
                  table above for each one&apos;s live GCP identifier.
                </p>
              ) : null}

              {run.applyOutput ? (
                <pre className="max-h-96 overflow-auto border border-border bg-muted/40 p-3 font-mono text-xs">
                  {run.applyOutput}
                </pre>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </PanelReveal>
  );
}
