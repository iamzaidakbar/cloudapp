"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterBar } from "@/components/shared/filter-bar";
import type { AwsServiceType } from "@/lib/generated/prisma/client";

const SERVICE_LABEL: Record<AwsServiceType, string> = {
  EC2_INSTANCE: "EC2",
  EBS_VOLUME: "EBS",
  SECURITY_GROUP: "Security Group",
  VPC: "VPC",
  S3_BUCKET: "S3",
  RDS_INSTANCE: "RDS",
  LAMBDA_FUNCTION: "Lambda",
  ELB_LOAD_BALANCER: "ELB",
  IAM_ROLE: "IAM",
  CLOUDWATCH_LOG_GROUP: "CloudWatch Logs",
};

type FilterOptions = { services: AwsServiceType[]; regions: string[]; statuses: string[] };

export function InfrastructureFilterBar({ filterOptions }: { filterOptions: FilterOptions }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    <FilterBar>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search resources…"
          className="w-56 pl-8"
        />
      </div>

      <Select value={searchParams.get("service") ?? "all"} onValueChange={(v) => updateParam("service", v)}>
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

      <Select value={searchParams.get("region") ?? "all"} onValueChange={(v) => updateParam("region", v)}>
        <SelectTrigger size="sm" className="w-32">
          <SelectValue placeholder="Region" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All regions</SelectItem>
          {filterOptions.regions.map((region) => (
            <SelectItem key={region} value={region} className="font-mono text-xs">
              {region}
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
          {filterOptions.statuses.map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FilterBar>
  );
}
