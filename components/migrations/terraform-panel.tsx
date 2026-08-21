"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, FileCode2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PanelReveal } from "@/components/motion/panel-reveal";
import { StatusTransition } from "@/components/motion/status-transition";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import { cn } from "@/lib/utils";
import { RUN_STATUS_CLASS } from "@/lib/run-status";
import type { TerraformRunStatus } from "@/lib/generated/prisma/client";

type TerraformRun = {
  id: string;
  version: number;
  status: TerraformRunStatus;
  queuedAt: string | Date;
  finishedAt: string | Date | null;
  errorMessage: string | null;
  terraformConfig: string;
  validateSucceeded: boolean | null;
  validateOutput: string | null;
  planSucceeded: boolean | null;
  planOutput: string | null;
  resourcesToCreate: number | null;
};

const TERMINAL_STATUSES = new Set<TerraformRunStatus>(["SUCCEEDED", "FAILED"]);
const POLL_INTERVAL_MS = 3000;

function validateDiagnostics(validateOutput: string): string[] {
  try {
    const parsed = JSON.parse(validateOutput) as { diagnostics?: Array<{ summary?: string; address?: string }> };
    return (parsed.diagnostics ?? []).map((d) => (d.address ? `${d.address}: ${d.summary}` : d.summary ?? "")).filter(Boolean);
  } catch {
    return [validateOutput];
  }
}

export function TerraformPanel({
  migrationPlanId,
  initialTerraformRun,
}: {
  migrationPlanId: string;
  initialTerraformRun: TerraformRun | null;
}) {
  const [run, setRun] = useState(initialTerraformRun);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const isActive = run ? !TERMINAL_STATUSES.has(run.status) : false;

  useEffect(() => {
    if (!isActive) return;

    cancelledRef.current = false;
    const interval = setInterval(async () => {
      const response = await fetch(`/api/migrations/${migrationPlanId}/terraform`);
      if (!response.ok || cancelledRef.current) return;

      const body = await response.json();
      if (!body.success || cancelledRef.current) return;

      setRun(body.data.terraformRun);
      if (!body.data.terraformRun || TERMINAL_STATUSES.has(body.data.terraformRun.status)) {
        clearInterval(interval);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelledRef.current = true;
      clearInterval(interval);
    };
  }, [migrationPlanId, isActive]);

  async function handleGenerate() {
    setIsStarting(true);
    setError(null);

    const response = await fetch(`/api/migrations/${migrationPlanId}/terraform`, { method: "POST" });
    const body = await response.json();

    if (!response.ok || !body.success) {
      setError(body.error ?? "Something went wrong. Please try again.");
      setIsStarting(false);
      return;
    }

    setRun(body.data.terraformRun);
    setIsStarting(false);
  }

  return (
    <PanelReveal>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Terraform</CardTitle>
            <Button type="button" onClick={handleGenerate} disabled={isStarting || isActive} variant={run ? "outline" : "default"}>
              {isStarting || isActive ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {isActive ? "Running…" : "Starting…"}
                </>
              ) : (
                <>
                  <FileCode2 className="size-4" />
                  {run ? "Regenerate Terraform" : "Generate Terraform"}
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {run ? (
            <div className="flex flex-col gap-3 rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>Run #{run.version}</span>
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

              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-muted-foreground">Generated configuration (main.tf)</p>
                <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs">{run.terraformConfig}</pre>
              </div>

              {run.validateSucceeded !== null ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-sm">
                    {run.validateSucceeded ? (
                      <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle className="size-4 text-destructive" />
                    )}
                    <span>{run.validateSucceeded ? "terraform validate passed" : "terraform validate failed"}</span>
                  </div>
                  {!run.validateSucceeded && run.validateOutput ? (
                    <ul className="list-disc pl-6 text-xs text-destructive">
                      {validateDiagnostics(run.validateOutput).map((line, i) => (
                        <li key={i} className="font-mono">
                          {line}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              {run.planSucceeded ? (
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    terraform plan — {run.resourcesToCreate ?? 0} resource{run.resourcesToCreate === 1 ? "" : "s"} would be created
                    (read-only dry run against your real GCP project — nothing was created)
                  </p>
                  <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs">{run.planOutput}</pre>
                </div>
              ) : run.planOutput ? (
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-destructive">terraform plan failed</p>
                  <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs">{run.planOutput}</pre>
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </PanelReveal>
  );
}
