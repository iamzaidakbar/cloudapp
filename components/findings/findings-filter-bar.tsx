"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FindingSeverity } from "@/lib/generated/prisma/client";

const SEVERITIES: FindingSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

type FindingsFilterBarProps = {
  severity: FindingSeverity | "all";
  onSeverityChange: (severity: FindingSeverity | "all") => void;
};

export function FindingsFilterBar({ severity, onSeverityChange }: FindingsFilterBarProps) {
  return (
    <Select
      value={severity}
      onValueChange={(value) => onSeverityChange(value as FindingSeverity | "all")}
    >
      <SelectTrigger size="sm" className="w-40">
        <SelectValue placeholder="All severities" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All severities</SelectItem>
        {SEVERITIES.map((value) => (
          <SelectItem key={value} value={value}>
            {value}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
