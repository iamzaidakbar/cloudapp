import Link from "next/link";
import {
  User,
  KeyRound,
  Building2,
  Users,
  Cloud,
  ChevronRight,
} from "lucide-react";
import { getCurrentAdmin } from "@/lib/auth/guard";
import { redirect } from "next/navigation";
import { FadeIn } from "@/components/motion/fade-in";
import { roleLabel } from "@/lib/auth/home-path";
import { cn } from "@/lib/utils";

type SettingsCard = {
  href: string;
  title: string;
  description: string;
  icon: typeof Cloud;
  disabled?: boolean;
  disabledHint?: string;
};

export default async function SettingsPage() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/login");
  }

  const isTenantAdmin = admin.role === "TENANT_ADMIN";
  const isMember = admin.role === "TENANT_MEMBER";

  const cards: SettingsCard[] = [
    {
      href: "/settings/profile",
      title: "Profile",
      description: "Update your display name. Email is read-only.",
      icon: User,
    },
    {
      href: "/settings/password",
      title: "Password",
      description: "Change the password you use to sign in.",
      icon: KeyRound,
    },
    {
      href: "/settings/organization",
      title: "Organization",
      description: isTenantAdmin
        ? "Rename your organization."
        : "View your organization name.",
      icon: Building2,
    },
    {
      href: "/settings/team",
      title: "Team",
      description: isTenantAdmin
        ? "Invite colleagues and manage who can access this workspace."
        : "Only Tenant Admins can manage team members.",
      icon: Users,
      disabled: isMember,
      disabledHint: "Tenant Admin only",
    },
    {
      href: "/settings/aws",
      title: "AWS connection",
      description:
        "View and manage the AWS account CloudShift-G audits and migrates.",
      icon: Cloud,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <FadeIn>
        <section className="border border-border bg-card">
          <div className="flex flex-col gap-1.5 px-4 py-3 md:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
              <span className="border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {roleLabel(admin.role)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Manage your account, organization, and cloud connection.
            </p>
          </div>
        </section>
      </FadeIn>

      <div className="flex flex-col gap-2">
        {cards.map((card, index) => {
          const Icon = card.icon;
          const content = (
            <>
              <div className="flex size-9 shrink-0 items-center justify-center border border-border bg-muted">
                <Icon
                  className={cn(
                    "size-4 text-muted-foreground",
                    !card.disabled && "transition-colors group-hover:text-foreground",
                  )}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      card.disabled
                        ? "text-muted-foreground"
                        : "text-foreground",
                    )}
                  >
                    {card.title}
                  </p>
                  {card.disabledHint ? (
                    <span className="border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {card.disabledHint}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </div>
              {!card.disabled ? (
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              ) : null}
            </>
          );

          if (card.disabled) {
            return (
              <FadeIn key={card.href} delayMs={40 + index * 30}>
                <div className="flex cursor-not-allowed items-center gap-3 border border-border bg-card/60 px-4 py-3.5 opacity-70 md:px-5">
                  {content}
                </div>
              </FadeIn>
            );
          }

          return (
            <FadeIn key={card.href} delayMs={40 + index * 30}>
              <Link
                href={card.href}
                className="group flex items-center gap-3 border border-border bg-card px-4 py-3.5 transition-colors hover:bg-muted/40 md:px-5"
              >
                {content}
              </Link>
            </FadeIn>
          );
        })}
      </div>
    </div>
  );
}
