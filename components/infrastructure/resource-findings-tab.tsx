"use client";

import { useState } from "react";
import { FindingsFilterBar } from "@/components/findings/findings-filter-bar";
import { FindingsTable, type FindingRow } from "@/components/findings/findings-table";
import { EmptyState } from "@/components/empty-state";
import { ShieldCheck } from "lucide-react";
import type { FindingSeverity } from "@/lib/generated/prisma/client";

export function ResourceFindingsTab({ findings }: { findings: FindingRow[] }) {
  const [severity, setSeverity] = useState<FindingSeverity | "all">("all");

  if (findings.length === 0) {
    return (
      <div className="pt-4">
        <EmptyState icon={ShieldCheck} title="No findings" description="This resource has no open findings." />
      </div>
    );
  }

  const filtered = severity === "all" ? findings : findings.filter((f) => f.severity === severity);

  return (
    <div className="flex flex-col gap-3 pt-4">
      <FindingsFilterBar severity={severity} onSeverityChange={setSeverity} />
      <div className="overflow-x-auto rounded-none border border-border">
        <FindingsTable findings={filtered} showResourceColumn={false} />
      </div>
    </div>
  );
}
