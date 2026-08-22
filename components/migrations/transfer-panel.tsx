"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { PanelReveal } from "@/components/motion/panel-reveal";
import { StatusTransition } from "@/components/motion/status-transition";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import { cn } from "@/lib/utils";
import { RUN_STATUS_CLASS } from "@/lib/run-status";
import type { TransferRunStatus } from "@/lib/generated/prisma/client";

export type TransferRunSummary = {
  id: string;
  version: number;
  status: TransferRunStatus;
  finishedAt: string | Date | null;
  errorMessage: string | null;
  objectsCopied: number | null;
  bytesCopied: string | number | bigint | null;
  skippedResources: unknown;
};

export type TransferRdsTarget = {
  id: string;
  label: string;
};

const TERMINAL_STATUSES = new Set<TransferRunStatus>(["SUCCEEDED", "FAILED"]);
const POLL_INTERVAL_MS = 2500;

function formatBytes(value: string | number | bigint | null): string {
  if (value === null || value === undefined) return "0";
  const n = typeof value === "bigint" ? Number(value) : Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function TransferPanel({
  migrationPlanId,
  initialTransferRun,
  rdsTargets = [],
  onRunChange,
}: {
  migrationPlanId: string;
  initialTransferRun: TransferRunSummary | null;
  /** Provisioned or planned RDS instances needing passwords at start. */
  rdsTargets?: TransferRdsTarget[];
  onRunChange?: (run: TransferRunSummary | null) => void;
}) {
  const [run, setRun] = useState(initialTransferRun);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const onRunChangeRef = useRef(onRunChange);
  useEffect(() => {
    onRunChangeRef.current = onRunChange;
  }, [onRunChange]);

  const isActive = Boolean(run && !TERMINAL_STATUSES.has(run.status));
  const needsRdsCreds = rdsTargets.length > 0;
  const rdsCredsReady =
    !needsRdsCreds ||
    rdsTargets.every((t) => (passwords[t.id] ?? "").trim().length > 0);

  function commitRun(next: TransferRunSummary | null) {
    setRun(next);
    onRunChangeRef.current?.(next);
  }

  useEffect(() => {
    if (!isActive) return;

    let cancelled = false;

    async function poll() {
      try {
        const response = await fetch(`/api/migrations/${migrationPlanId}/transfer`, {
          cache: "no-store",
        });
        if (!response.ok || cancelled) return;

        const body = await response.json();
        if (!body.success || cancelled) return;

        commitRun(body.data.transferRun);
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

  async function handleStart() {
    setIsStarting(true);
    setError(null);

    const payload =
      needsRdsCreds
        ? {
            rdsCredentials: rdsTargets.map((t) => ({
              migrationResourceId: t.id,
              password: passwords[t.id] ?? "",
              ...(usernames[t.id]?.trim()
                ? { username: usernames[t.id].trim() }
                : {}),
            })),
          }
        : {};

    const response = await fetch(`/api/migrations/${migrationPlanId}/transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();

    if (!response.ok || !body.success) {
      setError(body.error ?? "Something went wrong. Please try again.");
      setIsStarting(false);
      return;
    }

    // Clear passwords from the form after a successful start.
    setPasswords({});
    commitRun(body.data.transferRun);
    setIsStarting(false);
  }

  return (
    <PanelReveal>
      <section className="border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 md:px-5">
          <div className="flex flex-col gap-0.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <ArrowRightLeft className="size-3.5 text-foreground" />
              Data transfer
            </h2>
            <p className="text-xs text-muted-foreground">
              S3 → GCS, RDS → Cloud SQL, Lambda zip → Cloud Functions, EC2 AMI → GCE image
            </p>
          </div>
          <Button
            type="button"
            onClick={handleStart}
            disabled={isStarting || isActive || !rdsCredsReady}
          >
            {isStarting || isActive ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {isActive ? "Transferring…" : "Starting…"}
              </>
            ) : (
              <>
                <ArrowRightLeft className="size-4" />
                {run?.status === "SUCCEEDED" ? "Re-run transfer" : "Start data transfer"}
              </>
            )}
          </Button>
        </div>

        <div className="flex flex-col gap-3 p-4 md:p-5">
          <p className="text-xs text-muted-foreground">
            Copies S3 objects, dumps RDS into Cloud SQL, uploads Lambda zip packages onto Cloud
            Functions, and exports EC2 AMIs into GCE boot images (root volume). RDS passwords are
            Job-scoped only. EC2 export needs a vmimport role; private-only paths fail with a clear
            error.
          </p>

          {needsRdsCreds ? (
            <div className="flex flex-col gap-3 border border-border p-3">
              <p className="text-xs font-medium text-foreground">RDS credentials</p>
              {rdsTargets.map((target) => (
                <div key={target.id} className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">{target.label}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      type="text"
                      autoComplete="off"
                      placeholder="Username (optional — defaults to master)"
                      value={usernames[target.id] ?? ""}
                      disabled={isStarting || isActive}
                      onChange={(e) =>
                        setUsernames((prev) => ({ ...prev, [target.id]: e.target.value }))
                      }
                    />
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder="Password (required)"
                      value={passwords[target.id] ?? ""}
                      disabled={isStarting || isActive}
                      onChange={(e) =>
                        setPasswords((prev) => ({ ...prev, [target.id]: e.target.value }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {run ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>Transfer #{run.version}</span>
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
                  Transferred {run.objectsCopied ?? 0} object
                  {(run.objectsCopied ?? 0) === 1 ? "" : "s"} ({formatBytes(run.bytesCopied)}) —
                  see the resource table for per-resource totals.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </PanelReveal>
  );
}
