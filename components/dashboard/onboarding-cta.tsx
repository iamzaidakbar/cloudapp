import Link from "next/link";
import { Cloud, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";

export function OnboardingCta() {
  return (
    <FadeIn delayMs={0}>
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-wrap items-center gap-4">
          <Cloud className="size-8 shrink-0 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Connect your AWS account</p>
            <p className="text-sm text-muted-foreground">
              Connect an AWS account to start auditing infrastructure and planning your migration
              to GCP.
            </p>
          </div>
          <Link href="/onboarding" className={buttonVariants({ variant: "default" })}>
            Get Started
            <ArrowRight className="size-4" />
          </Link>
        </CardContent>
      </Card>
    </FadeIn>
  );
}
