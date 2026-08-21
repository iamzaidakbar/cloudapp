import { ListChecks } from "lucide-react";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { EmptyState } from "@/components/empty-state";
import { OnboardingCta } from "@/components/dashboard/onboarding-cta";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { DashboardKpis } from "@/components/dashboard/dashboard-kpis";
import { PipelineBoard } from "@/components/dashboard/pipeline-board";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { LatestAuditSummary } from "@/components/dashboard/latest-audit-summary";
import { LatestComparisonSummary } from "@/components/dashboard/latest-comparison-summary";
import { LatestMigrationSummary } from "@/components/dashboard/latest-migration-summary";
import { FadeIn } from "@/components/motion/fade-in";
import { requireTenantScope } from "@/lib/auth/guard";
import { getTenantWithConnection, isOnboardingComplete } from "@/lib/tenant";
import { listAuditRuns } from "@/lib/audits";
import { getLatestComparisonRun } from "@/lib/comparisons";
import { getLatestMigrationPlan } from "@/lib/migrations";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const admin = await requireTenantScope();
  const { tenant, connection } = await getTenantWithConnection(admin.tenantId);
  const connected = isOnboardingComplete(connection);

  const latestAuditRun = connected
    ? ((await listAuditRuns(tenant!.id, 0, 1)).items[0] ?? null)
    : null;
  const latestComparisonRun = connected
    ? await getLatestComparisonRun(tenant!.id)
    : null;
  const latestMigrationPlan = connected
    ? await getLatestMigrationPlan(tenant!.id)
    : null;

  const connectionStatus = connection?.status ?? "NOT_CONNECTED";

  return (
    <div className="flex flex-col gap-5">
      <DashboardHero
        tenantName={tenant?.name ?? "Your organization"}
        connected={connected}
        connectionStatus={connectionStatus}
        adminName={admin.name}
      />

      {!connected ? <OnboardingCta /> : null}

      <DashboardKpis
        connected={connected}
        auditRun={latestAuditRun}
        comparisonRun={latestComparisonRun}
      />

      <PipelineBoard
        connected={connected}
        auditRun={latestAuditRun}
        comparisonRun={latestComparisonRun}
        migrationPlan={latestMigrationPlan}
      />

      {latestAuditRun ? (
        <FadeIn delayMs={80}>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <LatestAuditSummary auditRun={latestAuditRun} />
            </div>
            <div className="flex flex-col gap-3 lg:col-span-2">
              {latestComparisonRun ? (
                <LatestComparisonSummary comparisonRun={latestComparisonRun} />
              ) : (
                <EmptyState
                  icon={ListChecks}
                  title="No comparison yet"
                  description="Compare AWS spend against GCP once an audit has completed."
                  className="min-h-[180px] py-8"
                >
                  <Link
                    href="/comparisons"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-1")}
                  >
                    Open comparisons
                  </Link>
                </EmptyState>
              )}
              {latestMigrationPlan ? (
                <LatestMigrationSummary migrationPlan={latestMigrationPlan} />
              ) : (
                <EmptyState
                  icon={ListChecks}
                  title="No migration plan"
                  description="Create a plan from comparison results when you are ready to move."
                  className="min-h-[140px] py-8"
                >
                  <Link
                    href="/migrations"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-1")}
                  >
                    View migrations
                  </Link>
                </EmptyState>
              )}
            </div>
          </div>
        </FadeIn>
      ) : (
        <EmptyState
          icon={ListChecks}
          title="No activity yet"
          description={
            connected
              ? "Run your first audit to populate KPIs, the pipeline, and activity panels."
              : "Connect an AWS account and run your first audit to see infrastructure, cost, and migration activity here."
          }
        >
          {connected ? (
            <Link
              href="/audits"
              className={cn(buttonVariants({ variant: "default", size: "sm" }), "mt-1")}
            >
              Go to audits
            </Link>
          ) : null}
        </EmptyState>
      )}

      <QuickActions connected={connected} />

      <div className="flex flex-col gap-2">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Session
        </h2>
        <SummaryCards />
      </div>
    </div>
  );
}
