"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterBar } from "@/components/shared/filter-bar";
import { SERVICE_LABEL } from "@/components/infrastructure/service-labels";
import type { AwsServiceType } from "@/lib/generated/prisma/client";

type FilterOptions = {
  services: AwsServiceType[];
  regions: string[];
  statuses: string[];
};

export function InfrastructureFilterBar({
  filterOptions,
}: {
  filterOptions: FilterOptions;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasFilters = ["service", "region", "status", "environment", "tag", "q"].some(
    (key) => Boolean(searchParams.get(key)),
  );

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    router.push(`/infrastructure?${params.toString()}`);
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (query !== (searchParams.get("q") ?? "")) {
        updateParam("q", query);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Filters
        </p>
        {hasFilters ? (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => router.push("/infrastructure")}
          >
            <X className="size-3" />
            Clear all
          </Button>
        ) : null}
      </div>
      <FilterBar className="items-center">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or resource ID…"
            className="w-full pl-8"
          />
        </div>

        <Select
          value={searchParams.get("service") ?? "all"}
          onValueChange={(v) => updateParam("service", v)}
        >
          <SelectTrigger size="sm" className="w-36">
            <SelectValue placeholder="Service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All services</SelectItem>
            {filterOptions.services.map((service) => (
              <SelectItem key={service} value={service}>
                {SERVICE_LABEL[service]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("region") ?? "all"}
          onValueChange={(v) => updateParam("region", v)}
        >
          <SelectTrigger size="sm" className="w-36">
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All regions</SelectItem>
            {filterOptions.regions.map((region) => (
              <SelectItem
                key={region}
                value={region}
                className="font-mono text-xs"
              >
                {region}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("status") ?? "all"}
          onValueChange={(v) => updateParam("status", v)}
        >
          <SelectTrigger size="sm" className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {filterOptions.statuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>
    </div>
  );
}
