"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { FindingsFilterBar } from "@/components/findings/findings-filter-bar";
import { FindingsTable, type FindingRow } from "@/components/findings/findings-table";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { FindingSeverity } from "@/lib/generated/prisma/client";

type FindingsResponse = {
  items: FindingRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function AuditFindingsPanel({ auditRunId }: { auditRunId: string }) {
  const [severity, setSeverity] = useState<FindingSeverity | "all">("all");
  const [page, setPage] = useState(1);
  // Deliberately no separate loading flag: the table keeps showing the
  // previous page/filter's results until the new fetch resolves, rather than
  // flashing a skeleton on every filter/page change — only the very first
  // load (data === null) shows one.
  const [data, setData] = useState<FindingsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (severity !== "all") params.set("severity", severity);

    fetch(`/api/audits/${auditRunId}/findings?${params.toString()}`)
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled && body.success) setData(body.data);
      });

    return () => {
      cancelled = true;
    };
  }, [auditRunId, severity, page]);

  function handleSeverityChange(value: FindingSeverity | "all") {
    setSeverity(value);
    setPage(1);
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex flex-col gap-3">
      <FindingsFilterBar severity={severity} onSeverityChange={handleSeverityChange} />

      {data.total === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={severity === "all" ? "No findings" : `No ${severity.toLowerCase()} findings`}
          description={
            severity === "all" ? "This audit run didn't surface any findings." : "Try a different severity filter."
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-none border border-border">
            <FindingsTable findings={data.items} />
          </div>
          {data.totalPages > 1 ? (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p>
                Page {data.page} of {data.totalPages} · {data.total} total
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
