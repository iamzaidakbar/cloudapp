import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/guard";
import { getTenantWithConnection, isOnboardingComplete } from "@/lib/tenant";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

function resumeStep(connection: { roleArn: string | null } | null) {
  if (!connection?.roleArn) return 2;
  return 3;
}

export default async function OnboardingPage() {
  const admin = await getCurrentAdmin();

  // No session yet: this is a brand-new organization registering for the
  // first time — step 1 (public self-service registration) starts fresh.
  if (!admin) {
    return <OnboardingWizard initialStep={1} initialTenant={null} initialConnection={null} />;
  }

  // Onboarding is a Tenant Admin action (connecting the AWS account) —
  // Tenant Members and the Platform Operator have nothing to resume here.
  if (admin.role !== "TENANT_ADMIN" || !admin.tenantId) {
    redirect(admin.role === "PLATFORM_OPERATOR" ? "/platform" : "/dashboard");
  }

  const { tenant, connection } = await getTenantWithConnection(admin.tenantId);

  if (isOnboardingComplete(connection)) {
    redirect("/settings/aws");
  }

  // Already registered (tenant + connection exist) — resume at step 2 or 3.
  return (
    <OnboardingWizard
      initialStep={resumeStep(connection)}
      initialTenant={tenant}
      initialConnection={connection}
    />
  );
}
