import { FadeIn } from "@/components/motion/fade-in";

type JobsHeroProps = {
  totalJobs: number;
};

export function JobsHero({ totalJobs }: JobsHeroProps) {
  return (
    <FadeIn>
      <section className="border border-border bg-card">
        <div className="flex flex-col gap-1.5 px-4 py-3 md:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight">Jobs</h1>
            <span className="border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Operations
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {totalJobs > 0
              ? `${totalJobs.toLocaleString()} run${totalJobs === 1 ? "" : "s"} across audits, comparisons, and migrations`
              : "Every audit, comparison, Terraform, apply, verification, and rollback run in one place"}
          </p>
        </div>
      </section>
    </FadeIn>
  );
}
