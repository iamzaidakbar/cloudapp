import Link from "next/link";
import {
  ArrowUpRight,
  CloudCog,
  GitCompare,
  HardDrive,
  ListChecks,
  Rocket,
  ScrollText,
  Settings,
} from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { cn } from "@/lib/utils";

const ACTIONS = [
  {
    href: "/infrastructure",
    label: "Infrastructure",
    description: "Browse discovered AWS resources",
    icon: HardDrive,
  },
  {
    href: "/audits",
    label: "Audits",
    description: "Run and review audit reports",
    icon: ListChecks,
  },
  {
    href: "/comparisons",
    label: "Comparisons",
    description: "AWS vs GCP cost models",
    icon: GitCompare,
  },
  {
    href: "/migrations",
    label: "Migrations",
    description: "Plans, apply, and rollback",
    icon: Rocket,
  },
  {
    href: "/jobs",
    label: "Jobs",
    description: "Background run history",
    icon: ScrollText,
  },
  {
    href: "/settings/aws",
    label: "AWS connection",
    description: "Role, verify, reconnect",
    icon: CloudCog,
  },
  {
    href: "/settings",
    label: "Settings",
    description: "Tenant configuration",
    icon: Settings,
  },
] as const;

export function QuickActions({ connected }: { connected: boolean }) {
  return (
    <FadeIn delayMs={140}>
      <section className="border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold tracking-tight">Quick actions</h2>
          <p className="text-xs text-muted-foreground">
            Jump into the workflows you use most
          </p>
        </div>
        <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3 xl:grid-cols-4">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            const disabled =
              !connected &&
              action.href !== "/settings" &&
              action.href !== "/settings/aws";

            const className = cn(
              "group flex items-start gap-3 border-border p-4 transition-colors sm:border-r sm:[&:nth-child(2n)]:border-r-0 lg:[&:nth-child(2n)]:border-r lg:[&:nth-child(3n)]:border-r-0 xl:[&:nth-child(3n)]:border-r xl:[&:nth-child(4n)]:border-r-0",
              "sm:border-b",
              disabled
                ? "pointer-events-none opacity-40"
                : "hover:bg-muted/40",
            );

            const content = (
              <>
                <div className="flex size-9 shrink-0 items-center justify-center border border-border bg-muted/50 transition-colors group-hover:border-foreground group-hover:bg-foreground group-hover:text-background">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{action.label}</p>
                    <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </div>
              </>
            );

            return disabled ? (
              <div key={action.href} className={className}>
                {content}
              </div>
            ) : (
              <Link key={action.href} href={action.href} className={className}>
                {content}
              </Link>
            );
          })}
        </div>
      </section>
    </FadeIn>
  );
}
