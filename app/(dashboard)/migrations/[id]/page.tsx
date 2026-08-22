import { notFound } from "next/navigation";
import { requireTenantScope } from "@/lib/auth/guard";
import { getMigrationPlan } from "@/lib/migrations";
import { getLatestTerraformRun } from "@/lib/terraform-runs";
import { getLatestApplyRun } from "@/lib/apply-runs";
import { getLatestVerificationRun } from "@/lib/verification-runs";
import { getLatestRollbackRun } from "@/lib/rollback-runs";
import { MigrationPlanHero } from "@/components/migrations/migration-plan-hero";
import { MigrationSummaryCards } from "@/components/migrations/migration-summary-cards";
import { MigrationResourcesTable } from "@/components/migrations/migration-resources-table";
import { PlanActions } from "@/components/migrations/plan-actions";
import { MigrationExecutionPanels } from "@/components/migrations/migration-execution-panels";
import { RollbackPanel } from "@/components/migrations/rollback-panel";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function MigrationPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireTenantScope();

  const plan = await getMigrationPlan(admin.tenantId, id);
  if (!plan) notFound();

  const isTenantAdmin = admin.role === "TENANT_ADMIN";
  const terraformRun = plan.status === "APPROVED" ? await getLatestTerraformRun(admin.tenantId, id) : null;
  const applyRun =
    terraformRun?.status === "SUCCEEDED" && terraformRun.planSucceeded
      ? await getLatestApplyRun(admin.tenantId, id)
      : null;
  const verificationRun =
    applyRun?.status === "SUCCEEDED" ? await getLatestVerificationRun(admin.tenantId, id) : null;
  const provisionedResources = plan.resources.filter((r) => r.gcpResourceSelfLink);
  const canRollback = isTenantAdmin && plan.status === "APPROVED" && provisionedResources.length > 0;
  const rollbackRun = canRollback ? await getLatestRollbackRun(admin.tenantId, id) : null;

  return (
    <div className="flex flex-col gap-5">
      <MigrationPlanHero
        sequenceNumber={plan.sequenceNumber}
        status={plan.status}
        createdAt={plan.createdAt}
        approvedAt={plan.approvedAt}
        cancelledAt={plan.cancelledAt}
        rolledBackAt={plan.rolledBackAt}
        actions={
          plan.status === "DRAFT" && isTenantAdmin ? (
            <PlanActions migrationPlanId={plan.id} />
          ) : undefined
        }
      />

      <MigrationSummaryCards
        resourceCount={plan.resourceCount}
        estimatedMigrationCost={plan.estimatedMigrationCost}
        estimatedAwsMonthlyCost={plan.estimatedAwsMonthlyCost}
        estimatedGcpMonthlyCost={plan.estimatedGcpMonthlyCost}
        costDataAvailable={plan.costDataAvailable}
      />

      {plan.status === "DRAFT" ? (
        <Alert>
          <AlertDescription>
            This migration requires Tenant Admin approval before Terraform generation or execution can happen.
            Approving records who approved it and when.
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

      {isTenantAdmin && plan.status === "APPROVED" ? (
        <MigrationExecutionPanels
          migrationPlanId={plan.id}
          initialTerraformRun={terraformRun}
          initialApplyRun={applyRun}
          initialVerificationRun={verificationRun}
        />
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
