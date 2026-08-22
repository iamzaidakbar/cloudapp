import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireTenantScope } from "@/lib/auth/guard";
import { getTenantWithConnection } from "@/lib/tenant";
import { AwsConnectionPanel } from "@/components/settings/aws-connection-panel";
import { FadeIn } from "@/components/motion/fade-in";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function SettingsAwsPage() {
  const admin = await requireTenantScope();
  const { tenant, connection } = await getTenantWithConnection(admin.tenantId);

  return (
    <div className="flex flex-col gap-5">
      <FadeIn>
        <section className="border border-border bg-card">
          <div className="flex flex-col gap-3 px-4 py-3 md:px-5">
            <Link
              href="/settings"
              className={cn(
                buttonVariants({ variant: "ghost", size: "xs" }),
                "-ml-1.5 w-fit",
              )}
            >
              <ArrowLeft className="size-3.5" />
              Settings
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <span className="border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Cloud account
              </span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
              AWS connection
            </h1>
            <p className="text-sm text-muted-foreground">
              CloudShift-G uses short-lived STS credentials only — no long-lived AWS keys are ever stored.
            </p>
          </div>
        </section>
      </FadeIn>

      <AwsConnectionPanel
        initialTenant={tenant}
        initialConnection={connection}
        canWrite={admin.role === "TENANT_ADMIN"}
      />
    </div>
  );
}
