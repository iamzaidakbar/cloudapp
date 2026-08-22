import Link from "next/link";
import {
  ArrowRight,
  Cloud,
  GitCompare,
  ListChecks,
  Rocket,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ConnectionStatusBadge } from "@/components/aws/connection-status-badge";
import { ViewOnlyBanner } from "@/components/shared/view-only-banner";
import { FadeIn } from "@/components/motion/fade-in";
import { cn } from "@/lib/utils";
import type { ConnectionStatus } from "@/lib/generated/prisma/client";

type DashboardHeroProps = {
  tenantName: string;
  connected: boolean;
  connectionStatus: ConnectionStatus;
  adminName: string | null;
  canWrite?: boolean;
};

export function DashboardHero({
  tenantName,
  connected,
  connectionStatus,
  adminName,
  canWrite = true,
}: DashboardHeroProps) {
  const greeting = adminName?.trim()
    ? `Welcome back, ${adminName.trim().split(/\s+/)[0]}`
    : "Welcome back";

  return (
    <FadeIn>
      <section className="relative overflow-hidden border border-border bg-card">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden
        />
        <div className="pointer-events-none absolute -right-16 -top-16 size-48 border border-border/60" aria-hidden />
        <div className="pointer-events-none absolute -right-8 -top-8 size-32 border border-border/40" aria-hidden />

        <div className="relative flex flex-col gap-6 p-5 md:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="border border-border bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Operations
              </span>
              <ConnectionStatusBadge status={connectionStatus} />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {greeting}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                {tenantName}
              </h1>
              <p className="max-w-xl text-sm text-muted-foreground">
                {connected
                  ? canWrite
                    ? "Monitor audits, cost comparisons, and migration plans from one command surface."
                    : "Review audits, comparisons, and migration plans. Tenant Admins run new work."
                  : canWrite
                    ? "Connect AWS to unlock infrastructure discovery, audits, and GCP migration planning."
                    : "AWS is not connected yet. Ask a Tenant Admin to finish setup."}
              </p>
            </div>
            {!canWrite ? (
              <ViewOnlyBanner className="max-w-xl" />
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {connected ? (
              canWrite ? (
                <>
                  <Link
                    href="/audits"
                    className={cn(buttonVariants({ variant: "default" }))}
                  >
                    <ListChecks className="size-4" />
                    Run audit
                  </Link>
                  <Link
                    href="/comparisons"
                    className={cn(buttonVariants({ variant: "outline" }))}
                  >
                    <GitCompare className="size-4" />
                    Compare
                  </Link>
                  <Link
                    href="/migrations/new"
                    className={cn(buttonVariants({ variant: "outline" }))}
                  >
                    <Rocket className="size-4" />
                    New migration
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/audits"
                    className={cn(buttonVariants({ variant: "outline" }))}
                  >
                    <ListChecks className="size-4" />
                    View audits
                  </Link>
                  <Link
                    href="/migrations"
                    className={cn(buttonVariants({ variant: "outline" }))}
                  >
                    <Rocket className="size-4" />
                    View migrations
                  </Link>
                </>
              )
            ) : canWrite ? (
              <Link
                href="/onboarding"
                className={cn(buttonVariants({ variant: "default" }))}
              >
                <Cloud className="size-4" />
                Connect AWS
                <ArrowRight className="size-4" />
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </FadeIn>
  );
}
