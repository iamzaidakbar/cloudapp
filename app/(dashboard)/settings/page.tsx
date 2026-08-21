import Link from "next/link";
import { Cloud, ChevronRight } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-5">
      <FadeIn>
        <section className="border border-border bg-card">
          <div className="flex flex-col gap-1.5 px-4 py-3 md:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
              <span className="border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Environment
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Manage your CloudShift-G environment.
            </p>
          </div>
        </section>
      </FadeIn>

      <FadeIn delayMs={40}>
        <Link
          href="/settings/aws"
          className="group flex items-center gap-3 border border-border bg-card px-4 py-3.5 transition-colors hover:bg-muted/40 md:px-5"
        >
          <div className="flex size-9 shrink-0 items-center justify-center border border-border bg-muted">
            <Cloud className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">AWS connection</p>
            <p className="text-sm text-muted-foreground">
              View and manage the AWS account CloudShift-G audits and migrates.
            </p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      </FadeIn>
    </div>
  );
}
