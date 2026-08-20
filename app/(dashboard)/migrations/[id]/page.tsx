import { notFound } from "next/navigation";
import { getTenantWithConnection } from "@/lib/tenant";
import { getMigrationPlan } from "@/lib/migrations";
import { getLatestTerraformRun } from "@/lib/terraform-runs";
import { MigrationStatusBadge } from "@/components/migrations/migration-status-badge";
import { MigrationSummaryCards } from "@/components/migrations/migration-summary-cards";
import { MigrationResourcesTable } from "@/components/migrations/migration-resources-table";
import { PlanActions } from "@/components/migrations/plan-actions";
import { TerraformPanel } from "@/components/migrations/terraform-panel";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function MigrationPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenant } = await getTenantWithConnection();
  if (!tenant) notFound();

  const plan = await getMigrationPlan(tenant.id, id);
  if (!plan) notFound();

  const terraformRun = plan.status === "APPROVED" ? await getLatestTerraformRun(tenant.id, id) : null;

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

      <MigrationResourcesTable resources={plan.resources} />

      {plan.status === "APPROVED" ? (
        <TerraformPanel migrationPlanId={plan.id} initialTerraformRun={terraformRun} />
      ) : null}
    </div>
  );
}
