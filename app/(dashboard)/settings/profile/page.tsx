import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guard";
import { ProfileForm } from "@/components/settings/profile-form";
import { FadeIn } from "@/components/motion/fade-in";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { roleLabel } from "@/lib/auth/home-path";

export default async function SettingsProfilePage() {
  const admin = await requireAdmin();

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
                Account
              </span>
              <span className="border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {roleLabel(admin.role)}
              </span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
              Profile
            </h1>
            <p className="text-sm text-muted-foreground">
              Your display name and sign-in email.
            </p>
          </div>
        </section>
      </FadeIn>

      <FadeIn delayMs={40}>
        <ProfileForm
          email={admin.email}
          initialName={admin.name?.trim() || ""}
        />
      </FadeIn>
    </div>
  );
}
