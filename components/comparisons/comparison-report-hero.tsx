"use client";

import Link from "next/link";
import { ArrowLeft, CalendarClock, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { buttonVariants } from "@/components/ui/button";
import { AuditStatusBadge } from "@/components/audits/audit-status-badge";
import { DataSourceBadge } from "@/components/aws/data-source-badge";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import { FadeIn } from "@/components/motion/fade-in";
import { StatusTransition } from "@/components/motion/status-transition";
import { cn } from "@/lib/utils";
import type { JobStatus, VerificationSource, GcpDataSource } from "@/lib/generated/prisma/client";

type ComparisonReportHeroProps = {
  version: number;
  status: JobStatus;
  awsDataSource: VerificationSource;
  gcpDataSource: GcpDataSource;
  startedAt: string | Date | null;
  finishedAt: string | Date | null;
  isTerminal: boolean;
  completedItems: number;
  totalItems: number;
  progressPercent: number;
};

function formatDuration(
  startedAt: string | Date | null,
  finishedAt: string | Date | null,
) {
  if (!startedAt || !finishedAt) return null;
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  if (ms < 1000) return "<1s";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return rem ? `${minutes}m ${rem}s` : `${minutes}m`;
}

export function ComparisonReportHero({
  version,
  status,
  awsDataSource,
  gcpDataSource,
  startedAt,
  finishedAt,
  isTerminal,
  completedItems,
  totalItems,
  progressPercent,
}: ComparisonReportHeroProps) {
  const duration = formatDuration(startedAt, finishedAt);

  return (
    <FadeIn>
      <section className="border border-border bg-card">
        <div className="flex flex-col gap-3 px-4 py-3 md:px-5">
          <Link
            href="/comparisons"
            className={cn(
              buttonVariants({ variant: "ghost", size: "xs" }),
              "-ml-1.5 w-fit",
            )}
          >
            <ArrowLeft className="size-3.5" />
            Comparisons
          </Link>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Comparison run
                </span>
                <StatusTransition statusKey={status}>
                  <AuditStatusBadge status={status} />
                </StatusTransition>
                <DataSourceBadge dataSource={awsDataSource} />
                <DataSourceBadge dataSource={gcpDataSource} />
              </div>
              <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
                Comparison #{version}
              </h1>
            </div>

            <dl className="grid grid-cols-2 gap-px border border-border bg-border sm:min-w-[24rem] sm:grid-cols-3">
              <div className="flex flex-col gap-0.5 bg-card px-3 py-2">
                <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <CalendarClock className="size-3" />
                  Started
                </dt>
                <dd className="text-xs tabular-nums leading-snug text-foreground sm:text-sm">
                  {startedAt ? <FormattedDateTime value={startedAt} /> : "—"}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5 bg-card px-3 py-2">
                <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <CheckCircle2 className="size-3" />
                  Completed
                </dt>
                <dd className="text-xs tabular-nums leading-snug text-foreground sm:text-sm">
                  {finishedAt ? <FormattedDateTime value={finishedAt} /> : "—"}
                </dd>
              </div>
              <div className="col-span-2 flex flex-col gap-0.5 bg-card px-3 py-2 sm:col-span-1">
                <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Duration
                </dt>
                <dd className="text-sm tabular-nums">{duration ?? "—"}</dd>
              </div>
            </dl>
          </div>

          {!isTerminal ? (
            <div className="flex flex-col gap-1.5 border-t border-border pt-3">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Pricing AWS and GCP resources…</span>
                <span className="tabular-nums">
                  {completedItems} / {totalItems}
                </span>
              </div>
              <Progress value={progressPercent} />
            </div>
          ) : null}
        </div>
      </section>
    </FadeIn>
  );
}
