import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentAdmin } from "@/lib/auth/guard";
import { listTeamMembers } from "@/lib/team";
import { TeamPanel } from "@/components/settings/team-panel";
import { FadeIn } from "@/components/motion/fade-in";
import { buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function SettingsTeamPage() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/login");
  }

  const isTenantAdmin = admin.role === "TENANT_ADMIN" && Boolean(admin.tenantId);

  const members = isTenantAdmin
    ? await listTeamMembers(admin.tenantId!)
    : [];

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
              Team
            </h1>
            <p className="text-sm text-muted-foreground">
              {isTenantAdmin
                ? "Add, promote, demote, or remove colleagues. You cannot change yourself or admin@cloudshiftg.local."
                : "Team management is limited to Tenant Admins."}
            </p>
          </div>
        </section>
      </FadeIn>

      <FadeIn delayMs={40}>
        {isTenantAdmin ? (
          <TeamPanel
            currentAdminId={admin.id}
            initialMembers={members.map((m) => ({
              ...m,
              lastLoginAt: m.lastLoginAt?.toISOString() ?? null,
              createdAt: m.createdAt.toISOString(),
            }))}
          />
        ) : (
          <Alert variant="destructive">
            <AlertDescription>
              You do not have permission to view or manage team members.
            </AlertDescription>
          </Alert>
        )}
      </FadeIn>
    </div>
  );
}
