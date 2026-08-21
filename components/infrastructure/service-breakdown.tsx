import Link from "next/link";
import { FadeIn } from "@/components/motion/fade-in";
import { SERVICE_LABEL } from "@/components/infrastructure/service-labels";
import { cn } from "@/lib/utils";
import type { AwsServiceType } from "@/lib/generated/prisma/client";

type ServiceBreakdownProps = {
  breakdown: { service: AwsServiceType; count: number }[];
  activeService?: string;
  totalResources: number;
};

export function ServiceBreakdown({
  breakdown,
  activeService,
  totalResources,
}: ServiceBreakdownProps) {
  if (breakdown.length === 0) return null;

  const max = Math.max(...breakdown.map((item) => item.count), 1);

  return (
    <FadeIn delayMs={40}>
      <section className="border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              By service
            </h2>
            <p className="text-xs text-muted-foreground">
              Click a service to filter the inventory
            </p>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {breakdown.length} types
          </span>
        </div>

        <ul className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3 xl:grid-cols-5">
          {breakdown.map((item) => {
            const isActive = activeService === item.service;
            const href = isActive
              ? "/infrastructure"
              : `/infrastructure?service=${item.service}`;
            const width = Math.max(8, Math.round((item.count / max) * 100));

            return (
              <li
                key={item.service}
                className="border-border sm:border-r sm:[&:nth-child(2n)]:border-r-0 lg:[&:nth-child(2n)]:border-r lg:[&:nth-child(3n)]:border-r-0 xl:[&:nth-child(3n)]:border-r xl:[&:nth-child(5n)]:border-r-0 sm:border-b"
              >
                <Link
                  href={href}
                  className={cn(
                    "flex flex-col gap-3 p-4 transition-colors hover:bg-muted/40",
                    isActive && "bg-foreground/[0.04]",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">
                      {SERVICE_LABEL[item.service]}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {item.count}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-muted">
                    <div
                      className="h-full bg-foreground transition-[width]"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {totalResources > 0
                      ? `${Math.round((item.count / totalResources) * 100)}% of inventory`
                      : "—"}
                    {isActive ? " · clear filter" : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </FadeIn>
  );
}
