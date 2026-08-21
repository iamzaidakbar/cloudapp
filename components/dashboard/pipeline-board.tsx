import Link from "next/link";
import { ArrowRight, Check, Circle } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { cn } from "@/lib/utils";
import type { SerializedAuditRun } from "@/lib/audits";
import type { SerializedComparisonRun } from "@/lib/comparisons";
import type { SerializedMigrationPlan } from "@/lib/migrations";

type PipelineBoardProps = {
  connected: boolean;
  auditRun: SerializedAuditRun | null;
  comparisonRun: SerializedComparisonRun | null;
  migrationPlan: SerializedMigrationPlan | null;
};

type Stage = {
  step: number;
  label: string;
  href: string;
  detail: string;
  done: boolean;
  active: boolean;
};

export function PipelineBoard({
  connected,
  auditRun,
  comparisonRun,
  migrationPlan,
}: PipelineBoardProps) {
  const auditDone = Boolean(auditRun && auditRun.status === "SUCCEEDED");
  const compareDone = Boolean(
    comparisonRun && comparisonRun.status === "SUCCEEDED",
  );
  const migrateActive = Boolean(migrationPlan);
  const migrateDone = Boolean(
    migrationPlan &&
      (migrationPlan.status === "APPROVED" ||
        migrationPlan.status === "ROLLED_BACK"),
  );

  const stages: Stage[] = [
    {
      step: 1,
      label: "Audit",
      href: auditRun ? `/audits/${auditRun.id}` : "/audits",
      detail: auditRun
        ? `Run #${auditRun.version} · ${auditRun.status}`
        : connected
          ? "No audit yet"
          : "Requires AWS",
      done: auditDone,
      active: connected && !auditDone,
    },
    {
      step: 2,
      label: "Compare",
      href: comparisonRun ? `/comparisons/${comparisonRun.id}` : "/comparisons",
      detail: comparisonRun
        ? `Run #${comparisonRun.version} · ${comparisonRun.status}`
        : auditDone
          ? "Ready to compare"
          : "After audit",
      done: compareDone,
      active: auditDone && !compareDone,
    },
    {
      step: 3,
      label: "Migrate",
      href: migrationPlan ? `/migrations/${migrationPlan.id}` : "/migrations",
      detail: migrationPlan
        ? `Plan #${migrationPlan.sequenceNumber} · ${migrationPlan.status}`
        : compareDone
          ? "Ready to plan"
          : "After comparison",
      done: migrateDone,
      active: compareDone && !migrateDone && migrateActive,
    },
  ];

  return (
    <FadeIn delayMs={60}>
      <section className="border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              Migration pipeline
            </h2>
            <p className="text-xs text-muted-foreground">
              Audit → compare → migrate
            </p>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {stages.filter((s) => s.done).length}/{stages.length} complete
          </span>
        </div>

        <ol className="grid grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
          {stages.map((stage, index) => (
            <li key={stage.label} className="relative">
              <Link
                href={stage.href}
                className={cn(
                  "flex h-full flex-col gap-3 p-4 transition-colors hover:bg-muted/40",
                  stage.active && "bg-foreground/[0.03]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center border text-[11px] font-semibold",
                        stage.done
                          ? "border-foreground bg-foreground text-background"
                          : stage.active
                            ? "border-foreground text-foreground"
                            : "border-border text-muted-foreground",
                      )}
                    >
                      {stage.done ? (
                        <Check className="size-3.5" />
                      ) : (
                        stage.step
                      )}
                    </span>
                    <span className="text-sm font-medium">{stage.label}</span>
                  </div>
                  {stage.active ? (
                    <Circle className="size-2 fill-foreground text-foreground" />
                  ) : (
                    <ArrowRight className="size-3.5 text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{stage.detail}</p>
                {index < stages.length - 1 ? (
                  <div
                    className="pointer-events-none absolute top-1/2 right-0 hidden h-px w-0 -translate-y-1/2 bg-border md:block"
                    aria-hidden
                  />
                ) : null}
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </FadeIn>
  );
}
