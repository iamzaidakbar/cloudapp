import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, CalendarClock, CheckCircle2, XCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { MigrationStatusBadge } from "@/components/migrations/migration-status-badge";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import { FadeIn } from "@/components/motion/fade-in";
import { cn } from "@/lib/utils";
import type { MigrationPlanStatus } from "@/lib/generated/prisma/client";

type MigrationPlanHeroProps = {
  sequenceNumber: number;
  status: MigrationPlanStatus;
  createdAt: string | Date;
  approvedAt: string | Date | null;
  cancelledAt: string | Date | null;
  rolledBackAt?: string | Date | null;
  actions?: ReactNode;
};

export function MigrationPlanHero({
  sequenceNumber,
  status,
  createdAt,
  approvedAt,
  cancelledAt,
  rolledBackAt,
  actions,
}: MigrationPlanHeroProps) {
  return (
    <FadeIn>
      <section className="border border-border bg-card">
        <div className="flex flex-col gap-3 px-4 py-3 md:px-5">
          <Link
            href="/migrations"
            className={cn(
              buttonVariants({ variant: "ghost", size: "xs" }),
              "-ml-1.5 w-fit",
            )}
          >
            <ArrowLeft className="size-3.5" />
            Migrations
          </Link>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Migration plan
                </span>
                <MigrationStatusBadge status={status} />
              </div>
              <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
                Migration #{sequenceNumber}
              </h1>
              {actions}
            </div>

            <dl className="grid grid-cols-2 gap-px border border-border bg-border sm:min-w-[24rem] sm:grid-cols-3">
              <div className="flex flex-col gap-0.5 bg-card px-3 py-2">
                <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <CalendarClock className="size-3" />
                  Created
                </dt>
                <dd className="text-xs tabular-nums leading-snug text-foreground sm:text-sm">
                  <FormattedDateTime value={createdAt} />
                </dd>
              </div>
              <div className="flex flex-col gap-0.5 bg-card px-3 py-2">
                <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <CheckCircle2 className="size-3" />
                  Approved
                </dt>
                <dd className="text-xs tabular-nums leading-snug text-foreground sm:text-sm">
                  {approvedAt ? <FormattedDateTime value={approvedAt} /> : "—"}
                </dd>
              </div>
              <div className="col-span-2 flex flex-col gap-0.5 bg-card px-3 py-2 sm:col-span-1">
                <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <XCircle className="size-3" />
                  {cancelledAt ? "Cancelled" : rolledBackAt ? "Rolled back" : "Closed"}
                </dt>
                <dd className="text-xs tabular-nums leading-snug text-foreground sm:text-sm">
                  {cancelledAt ? (
                    <FormattedDateTime value={cancelledAt} />
                  ) : rolledBackAt ? (
                    <FormattedDateTime value={rolledBackAt} />
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </FadeIn>
  );
}
