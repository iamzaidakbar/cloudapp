"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PanelReveal } from "@/components/motion/panel-reveal";
import { StatusTransition } from "@/components/motion/status-transition";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import { cn } from "@/lib/utils";
import { RUN_STATUS_CLASS } from "@/lib/run-status";
import type { AwsServiceType, RollbackRunStatus } from "@/lib/generated/prisma/client";

const SERVICE_LABEL: Partial<Record<AwsServiceType, string>> = {
  EC2_INSTANCE: "EC2",
  S3_BUCKET: "S3",
  RDS_INSTANCE: "RDS",
  LAMBDA_FUNCTION: "Lambda",
};

const TERMINAL_STATUSES = new Set<RollbackRunStatus>(["SUCCEEDED", "FAILED"]);
const POLL_INTERVAL_MS = 3000;

type ProvisionedResource = { id: string; awsService: AwsServiceType; awsResourceId: string; awsResourceName: string | null };

type RollbackRun = {
  id: string;
  version: number;
  status: RollbackRunStatus;
  finishedAt: string | Date | null;
  errorMessage: string | null;
  destroyOutput: string | null;
  resourcesDestroyed: number | null;
};

export function RollbackPanel({
  migrationPlanId,
  sequenceNumber,
  provisionedResources,
  initialRollbackRun,
}: {
  migrationPlanId: string;
  sequenceNumber: number;
  provisionedResources: ProvisionedResource[];
  initialRollbackRun: RollbackRun | null;
}) {
  const [run, setRun] = useState(initialRollbackRun);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const isActive = run ? !TERMINAL_STATUSES.has(run.status) : false;
  const confirmed = confirmText.trim() === String(sequenceNumber);

  useEffect(() => {
    if (!isActive) return;

    let cancelled = false;

    async function poll() {
      try {
        const response = await fetch(`/api/migrations/${migrationPlanId}/rollback`, {
          cache: "no-store",
        });
        if (!response.ok || cancelled) return;

        const body = await response.json();
        if (!body.success || cancelled) return;

        setRun(body.data.rollbackRun);
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
  }, [migrationPlanId, isActive, run?.id]);

  async function handleDestroy() {
    setIsStarting(true);
    setError(null);

    const response = await fetch(`/api/migrations/${migrationPlanId}/rollback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmSequenceNumber: sequenceNumber }),
    });
    const body = await response.json();

    if (!response.ok || !body.success) {
      setError(body.error ?? "Something went wrong. Please try again.");
      setIsStarting(false);
      return;
    }

    setRun(body.data.rollbackRun);
    setConfirmText("");
    setIsStarting(false);
  }

  return (
    <PanelReveal>
      <section className="border border-destructive/30 bg-destructive/5">
        <div className="border-b border-destructive/20 px-4 py-3 md:px-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <TriangleAlert className="size-3.5 text-destructive" />
            Rollback
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Permanently destroy provisioned GCP resources
          </p>
        </div>

        <div className="flex flex-col gap-3 p-4 md:p-5">
          <p className="text-xs text-muted-foreground">
            Runs a real <code className="font-mono">terraform destroy</code> against your real GCP project — it{" "}
            <span className="font-medium text-destructive">permanently deletes</span> the resources below. This cannot be
            undone.
          </p>

          <ul className="flex flex-col gap-1 text-xs">
            {provisionedResources.map((resource) => (
              <li key={resource.id} className="font-mono text-muted-foreground">
                {SERVICE_LABEL[resource.awsService] ?? resource.awsService} — {resource.awsResourceName ?? resource.awsResourceId}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={`Type ${sequenceNumber} to confirm`}
              disabled={isStarting || isActive}
              className="max-w-48"
            />
            <Button
              type="button"
              variant="destructive"
              onClick={handleDestroy}
              disabled={!confirmed || isStarting || isActive}
            >
              {isStarting || isActive ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {isActive ? "Destroying…" : "Starting…"}
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Destroy Resources
                </>
              )}
            </Button>
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {run ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>Rollback #{run.version}</span>
                <StatusTransition statusKey={run.status}>
                  <Badge variant="outline" className={cn("border-transparent", RUN_STATUS_CLASS[run.status])}>
                    {run.status}
                  </Badge>
                </StatusTransition>
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
                <p className="text-sm text-muted-foreground">
                  {run.resourcesDestroyed ?? 0} resource{run.resourcesDestroyed === 1 ? "" : "s"} destroyed for real.
                </p>
              ) : null}

              {run.destroyOutput ? (
                <pre className="max-h-96 overflow-auto border border-border bg-muted/40 p-3 font-mono text-xs">{run.destroyOutput}</pre>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </PanelReveal>
  );
}
