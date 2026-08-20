import { redirect } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import { getTenantWithConnection } from "@/lib/tenant";
import { getSelectableComparisonItems } from "@/lib/migrations";
import { ResourceSelector } from "@/components/migrations/resource-selector";
import { EmptyState } from "@/components/empty-state";

export default async function NewMigrationPage() {
  const { tenant } = await getTenantWithConnection();
  if (!tenant) redirect("/migrations");

  const selectable = await getSelectableComparisonItems(tenant.id);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">New Migration</h1>
        <p className="text-sm text-muted-foreground">
          Select resources from your latest comparison to include in this migration plan.
        </p>
      </div>

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
