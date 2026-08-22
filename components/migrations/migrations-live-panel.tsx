"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/empty-state";
import {
  MigrationRunsTable,
  type MigrationPlanRow,
} from "@/components/migrations/migration-runs-table";
import { StatusBadge } from "@/components/shared/status-badge";

const POLL_MS = 3000;
const LIVE_STATUSES = new Set(["DRAFT", "APPROVED"]);

type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type MigrationsLivePanelProps = {
  initialPlans: MigrationPlanRow[];
  initialMeta: PaginationMeta;
  emptyTitle: string;
  emptyDescription: string;
};

export function MigrationsLivePanel({
  initialPlans,
  initialMeta,
  emptyTitle,
  emptyDescription,
}: MigrationsLivePanelProps) {
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const [plans, setPlans] = useState(initialPlans);
  const [meta, setMeta] = useState(initialMeta);

  useEffect(() => {
    setPlans(initialPlans);
    setMeta(initialMeta);
  }, [initialPlans, initialMeta]);

  const hasLive = useMemo(
    () => plans.some((plan) => LIVE_STATUSES.has(plan.status)),
    [plans],
  );

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const response = await fetch(`/api/migrations?${query}`);
      if (!response.ok || cancelled) return;
      const body = await response.json();
      if (!body.success || cancelled) return;
      setPlans(body.data.items);
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

  return (
    <div className="flex flex-col gap-2">
      {hasLive ? (
        <div className="flex items-center gap-2 px-0.5">
          <StatusBadge tone="active" pulse>
            Updating live…
          </StatusBadge>
          <span className="text-xs text-muted-foreground">
            Open plans refresh every few seconds
          </span>
        </div>
      ) : null}

      <DataTableShell
        isEmpty={meta.total === 0}
        emptyState={
          <EmptyState
            icon={ArrowRightLeft}
            title={emptyTitle}
            description={emptyDescription}
          />
        }
        pagination={meta}
        buildPageHref={(p) => {
          const next = new URLSearchParams(query);
          next.set("page", String(p));
          return `/migrations?${next.toString()}`;
        }}
      >
        <MigrationRunsTable plans={plans} />
      </DataTableShell>
    </div>
  );
}
