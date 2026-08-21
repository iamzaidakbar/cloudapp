"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JOB_TYPES, JOB_STATUSES } from "@/lib/jobs-shared";

const TYPE_LABEL: Record<(typeof JOB_TYPES)[number], string> = {
  AUDIT: "Audit",
  COMPARISON: "Comparison",
  TERRAFORM: "Terraform",
  APPLY: "Apply",
  VERIFICATION: "Verification",
  ROLLBACK: "Rollback",
};

const STATUS_LABEL: Record<(typeof JOB_STATUSES)[number], string> = {
  QUEUED: "Queued",
  RUNNING: "Running",
  SUCCEEDED: "Succeeded",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export function JobsFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    router.push(`/jobs?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={searchParams.get("type") ?? "all"} onValueChange={(v) => updateParam("type", v)}>
        <SelectTrigger size="sm" className="w-36">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {JOB_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {TYPE_LABEL[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("status") ?? "all"} onValueChange={(v) => updateParam("status", v)}>
        <SelectTrigger size="sm" className="w-32">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {JOB_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {STATUS_LABEL[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
