import Link from "next/link";
import { ArrowRight, ListChecks } from "lucide-react";
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
      <section className="border border-border bg-card">
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">
                Infrastructure
              </h1>
              <span className="border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Inventory
              </span>
              {dataSource ? <DataSourceBadge dataSource={dataSource} /> : null}
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {hasInventory
                ? hasActiveFilters
                  ? `Showing ${matchingCount.toLocaleString()} of ${totalResources.toLocaleString()} from audit #${auditVersion}`
                  : `${totalResources.toLocaleString()} resources from audit #${auditVersion}`
                : "Run an audit to discover AWS resources"}
              {hasInventory && collectedAt ? (
                <>
                  {" · "}
                  <FormattedDateTime value={collectedAt} />
                </>
              ) : null}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {hasInventory ? (
              <Link
                href="/audits"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                <ListChecks className="size-3.5" />
                Audits
              </Link>
            ) : (
              <Link
                href="/audits"
                className={cn(buttonVariants({ variant: "default", size: "sm" }))}
              >
                <ListChecks className="size-3.5" />
                Run audit
                <ArrowRight className="size-3.5" />
              </Link>
            )}
          </div>
        </div>
      </section>
    </FadeIn>
  );
}
