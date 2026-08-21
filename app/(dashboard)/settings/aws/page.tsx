import { requireTenantScope } from "@/lib/auth/guard";
import { getTenantWithConnection } from "@/lib/tenant";
import { AwsConnectionPanel } from "@/components/settings/aws-connection-panel";
import { PageHeader } from "@/components/shared/page-header";

export default async function SettingsAwsPage() {
  const admin = await requireTenantScope();
  const { tenant, connection } = await getTenantWithConnection(admin.tenantId);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="AWS Connection"
        description="CloudShift-G uses short-lived STS credentials only — no long-lived AWS keys are ever stored."
      />

      <AwsConnectionPanel initialTenant={tenant} initialConnection={connection} />
    </div>
  );
}
