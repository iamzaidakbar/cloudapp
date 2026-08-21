import Link from "next/link";
import { ArrowRight, HardDrive, ListChecks } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { DataSourceBadge } from "@/components/aws/data-source-badge";
import { FadeIn } from "@/components/motion/fade-in";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import { cn } from "@/lib/utils";
import type { VerificationSource } from "@/lib/generated/prisma/client";

type InfrastructureHeroProps = {
  hasInventory: boolean;
  auditVersion?: number;
  dataSource?: VerificationSource | null;
  collectedAt?: string | Date | null;
  matchingCount: number;
  totalResources: number;
  hasActiveFilters: boolean;
};

export function InfrastructureHero({
  hasInventory,
  auditVersion,
  dataSource,
  collectedAt,
  matchingCount,
  totalResources,
  hasActiveFilters,
}: InfrastructureHeroProps) {
  return (
    <FadeIn>
      <section className="relative overflow-hidden border border-border bg-card">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-12 -bottom-12 size-40 border border-border/50"
          aria-hidden
        />

        <div className="relative flex flex-col gap-5 p-5 md:flex-row md:items-end md:justify-between md:p-6">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="border border-border bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Inventory
              </span>
              {dataSource ? <DataSourceBadge dataSource={dataSource} /> : null}
            </div>

            <div className="flex items-start gap-3">
              <div className="hidden size-11 shrink-0 items-center justify-center border border-border bg-muted sm:flex">
                <HardDrive className="size-5" />
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                  Infrastructure
                </h1>
                <p className="max-w-xl text-sm text-muted-foreground">
                  {hasInventory
                    ? hasActiveFilters
                      ? `Showing ${matchingCount.toLocaleString()} of ${totalResources.toLocaleString()} resources from audit #${auditVersion}.`
                      : `Catalog of ${totalResources.toLocaleString()} AWS resources discovered in audit #${auditVersion}.`
                    : "Run an audit to discover and catalog your AWS resources here."}
                </p>
                {hasInventory && collectedAt ? (
                  <p className="text-xs text-muted-foreground">
                    Snapshot collected <FormattedDateTime value={collectedAt} />
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasInventory ? (
              <Link
                href="/audits"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                <ListChecks className="size-4" />
                View audits
              </Link>
            ) : (
              <Link
                href="/audits"
                className={cn(buttonVariants({ variant: "default" }))}
              >
                <ListChecks className="size-4" />
                Run audit
                <ArrowRight className="size-4" />
              </Link>
            )}
          </div>
        </div>
      </section>
    </FadeIn>
  );
}
