import { ClipboardCheck } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { RunAuditButton } from "@/components/audits/run-audit-button";
import { StatusBadge } from "@/components/shared/status-badge";

type AuditsHeroProps = {
  tenantName: string;
  canRun: boolean;
  hasActiveRun: boolean;
  activeRunStartedAt?: string | Date | null;
  totalRuns: number;
};

export function AuditsHero({
  tenantName,
  canRun,
  hasActiveRun,
  activeRunStartedAt,
  totalRuns,
}: AuditsHeroProps) {
  return (
    <FadeIn>
      <section className="border border-border bg-card">
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">Audits</h1>
              <span className="border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Discovery
              </span>
              {hasActiveRun ? (
                <StatusBadge tone="active" pulse>
                  In progress
                </StatusBadge>
              ) : null}
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {totalRuns > 0
                ? `${totalRuns.toLocaleString()} audit run${totalRuns === 1 ? "" : "s"} for ${tenantName}`
                : `Run AWS infrastructure audits for ${tenantName}`}
            </p>
          </div>

          {canRun ? (
            <div className="flex shrink-0 items-center gap-2">
              <ClipboardCheck className="hidden size-4 text-muted-foreground sm:block" />
              <RunAuditButton
                hasActiveRun={hasActiveRun}
                activeRunStartedAt={activeRunStartedAt}
              />
            </div>
          ) : null}
        </div>
      </section>
    </FadeIn>
  );
}
