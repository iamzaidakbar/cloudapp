import { ListChecks } from "lucide-react";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { EmptyState } from "@/components/empty-state";
import { OnboardingCta } from "@/components/dashboard/onboarding-cta";
import { LatestAuditSummary } from "@/components/dashboard/latest-audit-summary";
import { getTenantWithConnection, isOnboardingComplete } from "@/lib/tenant";
import { listAuditRuns } from "@/lib/audits";

export default async function DashboardPage() {
  const { tenant, connection } = await getTenantWithConnection();
  const connected = isOnboardingComplete(connection);

  const latestAuditRun = connected
    ? (await listAuditRuns(tenant!.id, 0, 1)).items[0] ?? null
    : null;

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
        <LatestAuditSummary auditRun={latestAuditRun} />
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
