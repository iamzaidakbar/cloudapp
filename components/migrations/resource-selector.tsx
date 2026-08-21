"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRightLeft } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/format";
import type { SelectableComparisonItem } from "@/lib/migrations";
import type { AwsServiceType } from "@/lib/generated/prisma/client";

const SERVICE_LABEL: Partial<Record<AwsServiceType, string>> = {
  EC2_INSTANCE: "EC2",
  S3_BUCKET: "S3",
  RDS_INSTANCE: "RDS",
  LAMBDA_FUNCTION: "Lambda",
};

export function ResourceSelector({ items }: { items: SelectableComparisonItem[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allSelected = items.length > 0 && selected.size === items.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((item) => item.id)));
  }

  const totalMigrationCost = useMemo(
    () =>
      items
        .filter((item) => selected.has(item.id) && item.estimatedMigrationCost !== null)
        .reduce((sum, item) => sum + (item.estimatedMigrationCost ?? 0), 0),
    [items, selected],
  );
  const anySelectedMigrationCostAvailable = items.some(
    (item) => selected.has(item.id) && item.estimatedMigrationCost !== null,
  );

  async function handleCreate() {
    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/migrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comparisonItemIds: Array.from(selected) }),
    });
    const body = await response.json();

    if (!response.ok || !body.success) {
      setError(body.error ?? "Something went wrong. Please try again.");
      setIsSubmitting(false);
      return;
    }

    router.push(`/migrations/${body.data.migrationPlan.id}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-none border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
              </TableHead>
              <TableHead>Service</TableHead>
              <TableHead>AWS Resource</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>GCP Target</TableHead>
              <TableHead>Migration Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="cursor-pointer" onClick={() => toggle(item.id)}>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selected.has(item.id)}
                    onCheckedChange={() => toggle(item.id)}
                    aria-label={`Select ${item.awsResourceId}`}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap">{SERVICE_LABEL[item.awsService] ?? item.awsService}</TableCell>
                <TableCell className="max-w-48">
                  <span className="font-mono text-xs">{item.awsResourceName ?? item.awsResourceId}</span>
                  {item.awsSizeLabel ? <p className="text-xs text-muted-foreground">{item.awsSizeLabel}</p> : null}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{item.region}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <p>{item.gcpService}</p>
                  {item.gcpSizeLabel ? <p className="font-mono text-xs text-muted-foreground">{item.gcpSizeLabel}</p> : null}
                </TableCell>
                <TableCell>{item.estimatedMigrationCost !== null ? formatCurrency(item.estimatedMigrationCost) : "N/A"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-none border border-border bg-muted/30 px-4 py-3">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{selected.size}</span> of {items.length} resources selected
          {selected.size > 0 ? (
            <>
              {" "}
              — est. migration cost{" "}
              <span className="font-medium text-foreground">
                {anySelectedMigrationCostAvailable ? formatCurrency(totalMigrationCost) : "N/A"}
              </span>
            </>
          ) : null}
        </div>
        <Button type="button" onClick={handleCreate} disabled={selected.size === 0 || isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating…
            </>
          ) : (
            <>
              <ArrowRightLeft className="size-4" />
              Create Plan
            </>
          )}
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
