import { notFound } from "next/navigation";
import { getTenantWithConnection } from "@/lib/tenant";
import { getMigrationPlan } from "@/lib/migrations";
import { getLatestTerraformRun } from "@/lib/terraform-runs";
import { getLatestApplyRun } from "@/lib/apply-runs";
import { getLatestVerificationRun } from "@/lib/verification-runs";
import { getLatestRollbackRun } from "@/lib/rollback-runs";
import { MigrationStatusBadge } from "@/components/migrations/migration-status-badge";
import { MigrationSummaryCards } from "@/components/migrations/migration-summary-cards";
import { MigrationResourcesTable } from "@/components/migrations/migration-resources-table";
import { PlanActions } from "@/components/migrations/plan-actions";
import { TerraformPanel } from "@/components/migrations/terraform-panel";
import { ApplyPanel } from "@/components/migrations/apply-panel";
import { VerificationPanel } from "@/components/migrations/verification-panel";
import { RollbackPanel } from "@/components/migrations/rollback-panel";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function MigrationPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenant } = await getTenantWithConnection();
  if (!tenant) notFound();

  const plan = await getMigrationPlan(tenant.id, id);
  if (!plan) notFound();

  const terraformRun = plan.status === "APPROVED" ? await getLatestTerraformRun(tenant.id, id) : null;
  const applyRun = terraformRun?.status === "SUCCEEDED" && terraformRun.planSucceeded ? await getLatestApplyRun(tenant.id, id) : null;
  const canExecute = terraformRun?.status === "SUCCEEDED" && terraformRun.planSucceeded === true;
  const verificationRun = applyRun?.status === "SUCCEEDED" ? await getLatestVerificationRun(tenant.id, id) : null;
  const provisionedResources = plan.resources.filter((r) => r.gcpResourceSelfLink);
  const canRollback = plan.status === "APPROVED" && provisionedResources.length > 0;
  const rollbackRun = canRollback ? await getLatestRollbackRun(tenant.id, id) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold text-foreground">Migration #{plan.sequenceNumber}</h1>
          <MigrationStatusBadge status={plan.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          Created <FormattedDateTime value={plan.createdAt} />
          {plan.approvedAt ? (
            <>
              {" "}
              · Approved <FormattedDateTime value={plan.approvedAt} />
            </>
          ) : null}
          {plan.cancelledAt ? (
            <>
              {" "}
              · Cancelled <FormattedDateTime value={plan.cancelledAt} />
            </>
          ) : null}
        </p>
      </div>

      <MigrationSummaryCards
        resourceCount={plan.resourceCount}
        estimatedMigrationCost={plan.estimatedMigrationCost}
        estimatedAwsMonthlyCost={plan.estimatedAwsMonthlyCost}
        estimatedGcpMonthlyCost={plan.estimatedGcpMonthlyCost}
        costDataAvailable={plan.costDataAvailable}
      />

      {plan.status === "DRAFT" ? (
        <Alert>
          <AlertDescription className="flex flex-col gap-3">
            <span>
              This migration requires Admin approval before Terraform generation or execution can happen (not yet available in
              this build — planning and approval only). Approving records who approved it and when.
            </span>
            <PlanActions migrationPlanId={plan.id} />
          </AlertDescription>
        </Alert>
      ) : null}

      {plan.status === "CANCELLED" ? (
        <Alert variant="destructive">
          <AlertDescription>This migration plan was cancelled and can&apos;t be approved or executed.</AlertDescription>
        </Alert>
      ) : null}

      {plan.status === "ROLLED_BACK" ? (
        <Alert>
          <AlertDescription>
            This migration was rolled back
            {plan.rolledBackAt ? (
              <>
                {" "}
                on <FormattedDateTime value={plan.rolledBackAt} />
              </>
            ) : null}
            — all its provisioned resources were destroyed.
          </AlertDescription>
        </Alert>
      ) : null}

      <MigrationResourcesTable resources={plan.resources} />

      {plan.status === "APPROVED" ? (
        <TerraformPanel migrationPlanId={plan.id} initialTerraformRun={terraformRun} />
      ) : null}

      {canExecute ? <ApplyPanel migrationPlanId={plan.id} initialApplyRun={applyRun} /> : null}

      {applyRun?.status === "SUCCEEDED" ? (
        <VerificationPanel migrationPlanId={plan.id} initialVerificationRun={verificationRun} />
      ) : null}

      {canRollback ? (
        <RollbackPanel
          migrationPlanId={plan.id}
          sequenceNumber={plan.sequenceNumber}
          provisionedResources={provisionedResources}
          initialRollbackRun={rollbackRun}
        />
      ) : null}
    </div>
  );
}
