import { ArrowRightLeft } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import type { ReactNode } from "react";

type MigrationsHeroProps = {
  tenantName: string;
  totalPlans: number;
  actions?: ReactNode;
};

export function MigrationsHero({
  tenantName,
  totalPlans,
  actions,
}: MigrationsHeroProps) {
  return (
    <FadeIn>
      <section className="border border-border bg-card">
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">Migrations</h1>
              <span className="border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Execution
              </span>
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {totalPlans > 0
                ? `${totalPlans.toLocaleString()} migration plan${totalPlans === 1 ? "" : "s"} for ${tenantName}`
                : `Plan and approve AWS to GCP migrations for ${tenantName}`}
            </p>
          </div>

          {actions ? (
            <div className="flex shrink-0 items-center gap-2">
              <ArrowRightLeft className="hidden size-4 text-muted-foreground sm:block" />
              {actions}
            </div>
          ) : null}
        </div>
      </section>
    </FadeIn>
  );
}
