"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ListChecks } from "lucide-react";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/empty-state";
import { JobsTable } from "@/components/jobs/jobs-table";
import { StatusBadge } from "@/components/shared/status-badge";
import type { JobRow } from "@/lib/jobs";

type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const POLL_MS = 3000;
const ACTIVE = new Set(["QUEUED", "RUNNING"]);

type JobsLivePanelProps = {
  initialJobs: JobRow[];
  initialMeta: PaginationMeta;
  emptyDescription: string;
};

export function JobsLivePanel({
  initialJobs,
  initialMeta,
  emptyDescription,
}: JobsLivePanelProps) {
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const [jobs, setJobs] = useState(initialJobs);
  const [meta, setMeta] = useState(initialMeta);

  useEffect(() => {
    setJobs(initialJobs);
    setMeta(initialMeta);
  }, [initialJobs, initialMeta]);

  const hasActive = useMemo(
    () => jobs.some((job) => ACTIVE.has(job.status)),
    [jobs],
  );

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const response = await fetch(`/api/jobs?${query}`);
      if (!response.ok || cancelled) return;
      const body = await response.json();
      if (!body.success || cancelled) return;
      setJobs(body.data.items);
      setMeta({
        page: body.data.page,
        pageSize: body.data.pageSize,
        total: body.data.total,
        totalPages: body.data.totalPages,
      });
    }

    const interval = window.setInterval(refresh, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [query]);

  const buildPageHref = (p: number) => {
    const next = new URLSearchParams(query);
    next.set("page", String(p));
    return `/jobs?${next.toString()}`;
  };

  return (
    <div className="flex flex-col gap-2">
      {hasActive ? (
        <div className="flex items-center gap-2 px-0.5">
          <StatusBadge tone="active" pulse>
            Updating live…
          </StatusBadge>
          <span className="text-xs text-muted-foreground">
            Active jobs refresh every few seconds
          </span>
        </div>
      ) : null}

      <DataTableShell
        isEmpty={meta.total === 0}
        emptyState={
          <EmptyState
            icon={ListChecks}
            title="No jobs yet"
            description={emptyDescription}
          />
        }
        pagination={meta}
        buildPageHref={buildPageHref}
      >
        <JobsTable jobs={jobs} />
      </DataTableShell>
    </div>
  );
}
