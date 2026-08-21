"use client";

import { useEffect, useRef, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuditStatusBadge } from "@/components/audits/audit-status-badge";
import { DataSourceBadge } from "@/components/aws/data-source-badge";
import { AuditSummaryCards } from "@/components/audits/audit-summary-cards";
import { AuditServiceStatusList, type ServiceStatusRow } from "@/components/audits/audit-service-status-list";
import { AuditFindingsPanel } from "@/components/audits/audit-findings-panel";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import { PageHeader } from "@/components/shared/page-header";
import { StatusTransition } from "@/components/motion/status-transition";
import { PanelReveal } from "@/components/motion/panel-reveal";
import type { SerializedAuditRun } from "@/lib/audits";
import type { JobStatus, VerificationSource } from "@/lib/generated/prisma/client";

type AuditRunWithServices = SerializedAuditRun & { serviceStatuses: ServiceStatusRow[] };

const TERMINAL_STATUSES = new Set<JobStatus>(["SUCCEEDED", "FAILED", "CANCELLED"]);
const POLL_INTERVAL_MS = 3000;

export function AuditReportView({ initialAuditRun }: { initialAuditRun: AuditRunWithServices }) {
  const [auditRun, setAuditRun] = useState(initialAuditRun);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (TERMINAL_STATUSES.has(initialAuditRun.status)) return;

    cancelledRef.current = false;

    const interval = setInterval(async () => {
      const response = await fetch(`/api/audits/${initialAuditRun.id}`);
      if (!response.ok || cancelledRef.current) return;

      const body = await response.json();
      if (!body.success || cancelledRef.current) return;

      setAuditRun(body.data.auditRun);
      if (TERMINAL_STATUSES.has(body.data.auditRun.status)) {
        clearInterval(interval);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelledRef.current = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAuditRun.id]);

  const isTerminal = TERMINAL_STATUSES.has(auditRun.status);
  const completedServices = auditRun.serviceStatuses.filter((s) => s.status !== "PENDING").length;
  const progressPercent = Math.round((completedServices / auditRun.serviceStatuses.length) * 100);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`Audit #${auditRun.version}`}
        description={
          <>
            Started {auditRun.startedAt ? <FormattedDateTime value={auditRun.startedAt} /> : "—"}
            {auditRun.finishedAt ? (
              <>
                {" "}
                · Completed <FormattedDateTime value={auditRun.finishedAt} />
              </>
            ) : null}
          </>
        }
        actions={
          <>
            <StatusTransition statusKey={auditRun.status}>
              <AuditStatusBadge status={auditRun.status} />
            </StatusTransition>
            <DataSourceBadge dataSource={auditRun.dataSource as VerificationSource} />
          </>
        }
      />

      {auditRun.dataSource === "DEV_ADAPTER" ? (
        <Alert>
          <AlertDescription>
            This audit ran against simulated data via CloudShift-G&apos;s dev adapter, not real AWS. Findings and
            costs below are illustrative, not real.
          </AlertDescription>
        </Alert>
      ) : null}

      {auditRun.status === "FAILED" && auditRun.errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{auditRun.errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {!isTerminal ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Scanning AWS services…</span>
            <span>
              {completedServices} / {auditRun.serviceStatuses.length}
            </span>
          </div>
          <Progress value={progressPercent} />
        </div>
      ) : null}

      <AuditSummaryCards
        resourceCount={auditRun.resourceCount}
        findingCount={auditRun.findingCount}
        criticalFindingCount={auditRun.criticalFindingCount}
        estimatedMonthlyCost={auditRun.estimatedMonthlyCost}
        costDataAvailable={auditRun.costDataAvailable}
      />

      <AuditServiceStatusList services={auditRun.serviceStatuses} />

      {isTerminal && auditRun.status === "SUCCEEDED" ? (
        <PanelReveal>
          <AuditFindingsPanel auditRunId={auditRun.id} />
        </PanelReveal>
      ) : null}
    </div>
  );
}
