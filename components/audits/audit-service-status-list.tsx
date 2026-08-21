import { Check, X, Clock, MinusCircle } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { SERVICE_LABEL_LONG } from "@/components/infrastructure/service-labels";
import { cn } from "@/lib/utils";
import type {
  AwsServiceType,
  ServiceCollectionStatus,
} from "@/lib/generated/prisma/client";

const STATUS_ICON: Record<ServiceCollectionStatus, React.ReactNode> = {
  PENDING: <Clock className="size-3.5 text-muted-foreground" />,
  SUCCEEDED: <Check className="size-3.5 text-foreground" />,
  FAILED: <X className="size-3.5 text-destructive" />,
  SKIPPED: <MinusCircle className="size-3.5 text-muted-foreground" />,
};

const STATUS_LABEL: Record<ServiceCollectionStatus, string> = {
  PENDING: "Pending",
  SUCCEEDED: "Succeeded",
  FAILED: "Failed",
  SKIPPED: "Skipped",
};

export type ServiceStatusRow = {
  service: AwsServiceType;
  status: ServiceCollectionStatus;
  resourceCount: number;
  errorMessage: string | null;
};

export function AuditServiceStatusList({
  services,
}: {
  services: ServiceStatusRow[];
}) {
  const succeeded = services.filter((s) => s.status === "SUCCEEDED").length;
  const failed = services.filter((s) => s.status === "FAILED").length;

  return (
    <FadeIn delayMs={40}>
      <section className="border border-border bg-card">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border px-4 py-3 md:px-5">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-sm font-semibold tracking-tight">
              Per-service status
            </h2>
            <p className="text-xs text-muted-foreground">
              {succeeded} succeeded
              {failed > 0 ? ` · ${failed} failed` : ""} · {services.length}{" "}
              services
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {services.map((service) => (
            <div
              key={service.service}
              className={cn(
                "flex flex-col gap-2 bg-card px-3.5 py-3",
                service.status === "FAILED" && "bg-destructive/5",
              )}
              title={service.errorMessage ?? undefined}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug text-foreground">
                  {SERVICE_LABEL_LONG[service.service]}
                </p>
                {STATUS_ICON[service.status]}
              </div>
              <div className="mt-auto flex items-baseline justify-between gap-2">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {STATUS_LABEL[service.status]}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {service.status === "SUCCEEDED"
                    ? `${service.resourceCount.toLocaleString()} found`
                    : "—"}
                </span>
              </div>
              {service.errorMessage ? (
                <p className="truncate text-xs text-destructive">
                  {service.errorMessage}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </FadeIn>
  );
}
