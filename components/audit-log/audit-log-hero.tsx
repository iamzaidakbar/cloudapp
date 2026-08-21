import { FadeIn } from "@/components/motion/fade-in";

type AuditLogHeroProps = {
  totalActions: number;
};

export function AuditLogHero({ totalActions }: AuditLogHeroProps) {
  return (
    <FadeIn>
      <section className="border border-border bg-card">
        <div className="flex flex-col gap-1.5 px-4 py-3 md:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight">Audit log</h1>
            <span className="border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Governance
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {totalActions > 0
              ? `${totalActions.toLocaleString()} admin action${totalActions === 1 ? "" : "s"} recorded`
              : "Every admin action, who did it, and when"}
          </p>
        </div>
      </section>
    </FadeIn>
  );
}
