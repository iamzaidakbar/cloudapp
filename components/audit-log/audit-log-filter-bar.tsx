"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterBar } from "@/components/shared/filter-bar";
import { ADMIN_ACTION_TYPES, ADMIN_ACTION_LABEL } from "@/lib/audit-log-shared";

export function AuditLogFilterBar() {
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
    router.push(`/audit-log?${params.toString()}`);
  }

  return (
    <FilterBar>
      <Select value={searchParams.get("action") ?? "all"} onValueChange={(v) => updateParam("action", v)}>
        <SelectTrigger size="sm" className="w-56">
          <SelectValue placeholder="Action" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All actions</SelectItem>
          {ADMIN_ACTION_TYPES.map((action) => (
            <SelectItem key={action} value={action}>
              {ADMIN_ACTION_LABEL[action]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FilterBar>
  );
}
