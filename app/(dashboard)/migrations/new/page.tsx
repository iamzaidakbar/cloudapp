import { redirect } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import { requireTenantScope } from "@/lib/auth/guard";
import { getSelectableComparisonItems } from "@/lib/migrations";
import { ResourceSelector } from "@/components/migrations/resource-selector";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/shared/page-header";

export default async function NewMigrationPage() {
  const admin = await requireTenantScope();
  // Creating a migration plan is Tenant Admin's remit — Tenant Member is
  // read-only per the spec ("read-only access to their tenant's audits and
  // reports"); bounce them back to the list rather than showing this form.
  if (admin.role !== "TENANT_ADMIN") redirect("/migrations");

  const selectable = await getSelectableComparisonItems(admin.tenantId);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="New Migration"
        description="Select resources from your latest comparison to include in this migration plan."
      />

      {selectable && selectable.items.length > 0 ? (
        <ResourceSelector items={selectable.items} />
      ) : (
        <EmptyState
          icon={ArrowRightLeft}
          title="No resources to select"
          description="Run a successful AWS to GCP comparison first — VPCs aren't individually migratable, so at least one EC2, S3, RDS, or Lambda resource is needed."
        />
      )}
    </div>
  );
}
