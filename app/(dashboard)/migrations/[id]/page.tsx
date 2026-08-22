import { notFound } from "next/navigation";
import { requireTenantScope } from "@/lib/auth/guard";
import { getMigrationPlan } from "@/lib/migrations";
import { getLatestTerraformRun } from "@/lib/terraform-runs";
import { getLatestApplyRun } from "@/lib/apply-runs";
import { getLatestVerificationRun } from "@/lib/verification-runs";
import { getLatestRollbackRun } from "@/lib/rollback-runs";
import { getLatestTransferRun } from "@/lib/transfer-runs";
import { MigrationPlanHero } from "@/components/migrations/migration-plan-hero";
import { MigrationSummaryCards } from "@/components/migrations/migration-summary-cards";
import { MigrationResourcesTable } from "@/components/migrations/migration-resources-table";
import { PlanActions } from "@/components/migrations/plan-actions";
import { MigrationExecutionPanels } from "@/components/migrations/migration-execution-panels";
import { RollbackPanel } from "@/components/migrations/rollback-panel";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ViewOnlyBanner } from "@/components/shared/view-only-banner";

function serializeTransferRun<T extends { bytesCopied: bigint | null } | null>(run: T) {
  if (!run) return null;
  return {
    ...run,
    bytesCopied: run.bytesCopied == null ? null : run.bytesCopied.toString(),
  };
}

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
  const transferRun =
    applyRun?.status === "SUCCEEDED" ? await getLatestTransferRun(admin.tenantId, id) : null;
  const provisionedResources = plan.resources.filter((r) => r.gcpResourceSelfLink);
  // S3/RDS presence only — do not require gcpResourceSelfLink here. That link is
  // written during Apply; requiring it at SSR hides the Transfer panel until
  // a full refresh even after Apply polls SUCCEEDED client-side.
  const hasTransferTargets = plan.resources.some(
    (r) =>
      r.awsService === "S3_BUCKET" ||
      r.awsService === "RDS_INSTANCE" ||
      r.awsService === "LAMBDA_FUNCTION" ||
      r.awsService === "EC2_INSTANCE",
  );
  const rdsTransferTargets = plan.resources
    .filter((r) => r.awsService === "RDS_INSTANCE")
    .map((r) => ({
      id: r.id,
      label: r.awsResourceName ?? r.awsResourceId,
    }));
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

      {!isTenantAdmin ? (
        <ViewOnlyBanner message="View only · Tenant Admins approve plans and run Terraform, apply, transfer, and rollback." />
      ) : null}

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

      <MigrationResourcesTable
        exportHref={`/api/migrations/${plan.id}/export`}
        resources={plan.resources.map((r) => ({
          ...r,
          bytesTransferred:
            r.bytesTransferred == null ? null : r.bytesTransferred.toString(),
        }))}
      />

      {isTenantAdmin && plan.status === "APPROVED" ? (
        <MigrationExecutionPanels
          migrationPlanId={plan.id}
          initialTerraformRun={terraformRun}
          initialApplyRun={applyRun}
          initialVerificationRun={verificationRun}
          initialTransferRun={serializeTransferRun(transferRun)}
          hasEligibleTransferResources={hasTransferTargets}
          rdsTransferTargets={rdsTransferTargets}
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
