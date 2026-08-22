import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentAdmin } from "@/lib/auth/guard";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { FadeIn } from "@/components/motion/fade-in";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function SettingsPasswordPage() {
  const admin = await getCurrentAdmin();
  const forced = Boolean(admin?.mustChangePassword);

  return (
    <div className="flex flex-col gap-5">
      <FadeIn>
        <section className="border border-border bg-card">
          <div className="flex flex-col gap-3 px-4 py-3 md:px-5">
            {!forced ? (
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
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <span className="border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Account
              </span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
              Password
            </h1>
            <p className="text-sm text-muted-foreground">
              {forced
                ? "Choose a new password to finish signing in."
                : "Update the password you use to sign in to CloudShift-G."}
            </p>
          </div>
        </section>
      </FadeIn>

      <FadeIn delayMs={40}>
        <ChangePasswordForm forced={forced} />
      </FadeIn>
    </div>
  );
}
