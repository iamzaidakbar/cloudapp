import { redirect } from "next/navigation";
import { getTenantWithConnection, isOnboardingComplete } from "@/lib/tenant";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

function resumeStep(
  tenant: { id: string } | null,
  connection: { roleArn: string | null } | null,
) {
  if (!tenant) return 1;
  if (!connection?.roleArn) return 2;
  return 3;
}

export default async function OnboardingPage() {
  const { tenant, connection } = await getTenantWithConnection();

  if (isOnboardingComplete(connection)) {
    redirect("/settings/aws");
  }

  return (
    <OnboardingWizard
      initialStep={resumeStep(tenant, connection)}
      initialTenant={tenant}
      initialConnection={connection}
    />
  );
}
