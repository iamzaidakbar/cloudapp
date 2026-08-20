import { getTenantWithConnection } from "@/lib/tenant";
import { AwsConnectionPanel } from "@/components/settings/aws-connection-panel";

export default async function SettingsAwsPage() {
  const { tenant, connection } = await getTenantWithConnection();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">AWS Connection</h1>
        <p className="text-sm text-muted-foreground">
          CloudShift-G uses short-lived STS credentials only — no long-lived AWS keys are ever
          stored.
        </p>
      </div>

      <AwsConnectionPanel initialTenant={tenant} initialConnection={connection} />
    </div>
  );
}
