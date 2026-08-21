"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PanelReveal } from "@/components/motion/panel-reveal";
import { StatusTransition } from "@/components/motion/status-transition";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import { cn } from "@/lib/utils";
import type { AwsServiceType, VerificationStatus } from "@/lib/generated/prisma/client";

const SERVICE_LABEL: Partial<Record<AwsServiceType, string>> = {
  EC2_INSTANCE: "EC2",
  S3_BUCKET: "S3",
  RDS_INSTANCE: "RDS",
  LAMBDA_FUNCTION: "Lambda",
};

const STATUS_CLASS: Record<VerificationStatus, string> = {
  HEALTHY: "border-success/40 bg-success/10 text-success",
  UNHEALTHY: "border-destructive/40 bg-destructive/10 text-destructive",
  UNAVAILABLE: "border-border bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<VerificationStatus, string> = {
  HEALTHY: "Healthy",
  UNHEALTHY: "Unhealthy",
  UNAVAILABLE: "Unavailable",
};

type VerificationCheck = {
  id: string;
  status: VerificationStatus;
  detail: string | null;
  migrationResource: {
    id: string;
    awsService: AwsServiceType;
    awsResourceId: string;
    awsResourceName: string | null;
  };
};

type VerificationRun = {
  id: string;
  version: number;
  checkedAt: string | Date;
  checks: VerificationCheck[];
};

export function VerificationPanel({
  migrationPlanId,
  initialVerificationRun,
}: {
  migrationPlanId: string;
  initialVerificationRun: VerificationRun | null;
}) {
  const [run, setRun] = useState(initialVerificationRun);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    setIsRunning(true);
    setError(null);

    const response = await fetch(`/api/migrations/${migrationPlanId}/verify`, { method: "POST" });
    const body = await response.json();

    if (!response.ok || !body.success) {
      setError(body.error ?? "Something went wrong. Please try again.");
      setIsRunning(false);
      return;
    }

    setRun(body.data.verificationRun);
    setIsRunning(false);
  }

  return (
    <PanelReveal>
      <section className="border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 md:px-5">
          <div className="flex flex-col gap-0.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <ShieldCheck className="size-3.5 text-muted-foreground" />
              Verification
            </h2>
            <p className="text-xs text-muted-foreground">
              Live health checks against provisioned GCP resources
            </p>
          </div>
          <Button type="button" variant="outline" onClick={handleVerify} disabled={isRunning}>
            {isRunning ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Checking…
              </>
            ) : (
              <>
                <ShieldCheck className="size-4" />
                {run ? "Re-run Verification" : "Run Verification"}
              </>
            )}
          </Button>
        </div>

        <div className="flex flex-col gap-3 p-4 md:p-5">
          <p className="text-xs text-muted-foreground">
            Queries each provisioned resource&apos;s real, live status in GCP right now — confirms it&apos;s actually
            healthy, not just that it was created successfully earlier.
          </p>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {run ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>Verification #{run.version}</span>
                <span>
                  · Checked <FormattedDateTime value={run.checkedAt} />
                </span>
              </div>

              <div className="overflow-x-auto border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resource</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Detail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {run.checks.map((check) => (
                      <TableRow key={check.id}>
                        <TableCell className="whitespace-nowrap">
                          <span className="text-foreground">
                            {SERVICE_LABEL[check.migrationResource.awsService] ?? check.migrationResource.awsService}
                          </span>{" "}
                          <span className="font-mono text-xs text-muted-foreground">
                            {check.migrationResource.awsResourceName ?? check.migrationResource.awsResourceId}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusTransition statusKey={check.status}>
                            <Badge variant="outline" className={cn("border-transparent", STATUS_CLASS[check.status])}>
                              {STATUS_LABEL[check.status]}
                            </Badge>
                          </StatusTransition>
                        </TableCell>
                        <TableCell className="max-w-96 truncate text-xs text-muted-foreground" title={check.detail ?? undefined}>
                          {check.detail ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </PanelReveal>
  );
}
