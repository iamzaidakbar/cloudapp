import { ListChecks } from "lucide-react";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { EmptyState } from "@/components/empty-state";
import { OnboardingCta } from "@/components/dashboard/onboarding-cta";
import { LatestAuditSummary } from "@/components/dashboard/latest-audit-summary";
import { LatestComparisonSummary } from "@/components/dashboard/latest-comparison-summary";
import { LatestMigrationSummary } from "@/components/dashboard/latest-migration-summary";
import { requireTenantScope } from "@/lib/auth/guard";
import { getTenantWithConnection, isOnboardingComplete } from "@/lib/tenant";
import { listAuditRuns } from "@/lib/audits";
import { getLatestComparisonRun } from "@/lib/comparisons";
import { getLatestMigrationPlan } from "@/lib/migrations";

export default async function DashboardPage() {
  const admin = await requireTenantScope();
  const { tenant, connection } = await getTenantWithConnection(admin.tenantId);
  const connected = isOnboardingComplete(connection);

  const latestAuditRun = connected
    ? (await listAuditRuns(tenant!.id, 0, 1)).items[0] ?? null
    : null;
  const latestComparisonRun = connected ? await getLatestComparisonRun(tenant!.id) : null;
  const latestMigrationPlan = connected ? await getLatestMigrationPlan(tenant!.id) : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your CloudShift-G environment.
        </p>
      </div>

      {!connected ? <OnboardingCta /> : null}

      <SummaryCards />

      {latestAuditRun ? (
        <>
          <LatestAuditSummary auditRun={latestAuditRun} />
          {latestComparisonRun ? <LatestComparisonSummary comparisonRun={latestComparisonRun} /> : null}
          {latestMigrationPlan ? <LatestMigrationSummary migrationPlan={latestMigrationPlan} /> : null}
        </>
      ) : (
        <EmptyState
          icon={ListChecks}
          title="No activity yet"
          description={
            connected
              ? "Run your first audit to see infrastructure, cost, and migration activity here."
              : "Connect an AWS account and run your first audit to see infrastructure, cost, and migration activity here."
          }
        />
      )}
    </div>
  );
}
