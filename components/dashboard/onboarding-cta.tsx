import Link from "next/link";
import { ArrowRight, Cloud } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { cn } from "@/lib/utils";

export function OnboardingCta() {
  return (
    <FadeIn delayMs={20}>
      <section className="relative overflow-hidden border border-foreground/20 bg-foreground text-background">
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg, currentColor 0 1px, transparent 1px 12px)",
          }}
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center border border-background/30">
              <Cloud className="size-5" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold tracking-tight">
                Connect your AWS account
              </p>
              <p className="max-w-lg text-sm text-background/70">
                Link a read-only IAM role to unlock infrastructure discovery,
                audits, cost comparisons, and migration planning.
              </p>
            </div>
          </div>
          <Link
            href="/onboarding"
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "shrink-0 border-transparent bg-background text-foreground hover:bg-background/90",
            )}
          >
            Start onboarding
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </FadeIn>
  );
}
