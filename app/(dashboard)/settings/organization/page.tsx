import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireTenantScope } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { OrganizationForm } from "@/components/settings/organization-form";
import { FadeIn } from "@/components/motion/fade-in";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function SettingsOrganizationPage() {
  const admin = await requireTenantScope();
  const tenant = await prisma.tenant.findUnique({
    where: { id: admin.tenantId },
    select: { name: true },
  });
  if (!tenant) {
    redirect("/settings");
  }

  const canEdit = admin.role === "TENANT_ADMIN";

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
                Workspace
              </span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
              Organization
            </h1>
            <p className="text-sm text-muted-foreground">
              {canEdit
                ? "Rename your CloudShift-G organization."
                : "View your organization name. Only Tenant Admins can edit it."}
            </p>
          </div>
        </section>
      </FadeIn>

      <FadeIn delayMs={40}>
        <OrganizationForm
          initialName={tenant.name}
          readOnly={!canEdit}
        />
      </FadeIn>
    </div>
  );
}
