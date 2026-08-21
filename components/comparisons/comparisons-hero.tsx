import { GitCompare } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { RunComparisonButton } from "@/components/comparisons/run-comparison-button";
import { StatusBadge } from "@/components/shared/status-badge";

type ComparisonsHeroProps = {
  tenantName: string;
  canRun: boolean;
  hasActiveRun: boolean;
  activeRunStartedAt?: string | Date | null;
  hasSuccessfulAudit: boolean;
  totalRuns: number;
};

export function ComparisonsHero({
  tenantName,
  canRun,
  hasActiveRun,
  activeRunStartedAt,
  hasSuccessfulAudit,
  totalRuns,
}: ComparisonsHeroProps) {
  return (
    <FadeIn>
      <section className="border border-border bg-card">
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">Comparisons</h1>
              <span className="border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Mapping
              </span>
              {hasActiveRun ? (
                <StatusBadge tone="active" pulse>
                  In progress
                </StatusBadge>
              ) : null}
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {totalRuns > 0
                ? `${totalRuns.toLocaleString()} comparison run${totalRuns === 1 ? "" : "s"} for ${tenantName}`
                : `AWS vs GCP mapping and cost comparison for ${tenantName}`}
            </p>
          </div>

          {canRun ? (
            <div className="flex shrink-0 items-center gap-2">
              <GitCompare className="hidden size-4 text-muted-foreground sm:block" />
              <RunComparisonButton
                hasActiveRun={hasActiveRun}
                activeRunStartedAt={activeRunStartedAt}
                hasSuccessfulAudit={hasSuccessfulAudit}
              />
            </div>
          ) : null}
        </div>
      </section>
    </FadeIn>
  );
}
