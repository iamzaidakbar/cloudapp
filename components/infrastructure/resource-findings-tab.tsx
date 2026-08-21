"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { FindingsFilterBar } from "@/components/findings/findings-filter-bar";
import {
  FindingsTable,
  type FindingRow,
} from "@/components/findings/findings-table";
import { EmptyState } from "@/components/empty-state";
import type { FindingSeverity } from "@/lib/generated/prisma/client";

export function ResourceFindingsTab({ findings }: { findings: FindingRow[] }) {
  const [severity, setSeverity] = useState<FindingSeverity | "all">("all");

  if (findings.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No findings"
        description="This resource has no open findings in the latest audit."
        className="py-10"
      />
    );
  }

  const filtered =
    severity === "all"
      ? findings
      : findings.filter((f) => f.severity === severity);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Findings</h2>
          <p className="text-xs text-muted-foreground">
            {findings.length} issue{findings.length === 1 ? "" : "s"} linked to
            this resource
          </p>
        </div>
        <FindingsFilterBar severity={severity} onSeverityChange={setSeverity} />
      </div>
      <div className="overflow-x-auto border border-border">
        <FindingsTable findings={filtered} showResourceColumn={false} />
      </div>
    </div>
  );
}
