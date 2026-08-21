import Link from "next/link";
import { ArrowLeft, MapPin, Tag } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { ResourceStatusBadge } from "@/components/infrastructure/resource-status-badge";
import { DataSourceBadge } from "@/components/aws/data-source-badge";
import { FadeIn } from "@/components/motion/fade-in";
import { SERVICE_LABEL_LONG } from "@/components/infrastructure/service-labels";
import { cn } from "@/lib/utils";
import type {
  AwsServiceType,
  VerificationSource,
} from "@/lib/generated/prisma/client";

type ResourceIdentityHeaderProps = {
  service: AwsServiceType;
  name: string | null;
  resourceId: string;
  region: string;
  status: string | null;
  environment: string | null;
  dataSource: VerificationSource;
};

export function ResourceIdentityHeader({
  service,
  name,
  resourceId,
  region,
  status,
  environment,
  dataSource,
}: ResourceIdentityHeaderProps) {
  return (
    <FadeIn delayMs={0}>
      <section className="relative overflow-hidden border border-border bg-card">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
          aria-hidden
        />

        <div className="relative flex flex-col gap-4 p-5 md:p-6">
          <Link
            href="/infrastructure"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 w-fit",
            )}
          >
            <ArrowLeft className="size-3.5" />
            Infrastructure
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="border border-border bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {SERVICE_LABEL_LONG[service]}
                </span>
                <DataSourceBadge dataSource={dataSource} />
                <ResourceStatusBadge status={status} />
              </div>

              <div className="flex flex-col gap-1">
                <h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">
                  {name ?? resourceId}
                </h1>
                <div className="flex max-w-full items-center gap-1.5">
                  <code className="truncate font-mono text-xs text-muted-foreground">
                    {resourceId}
                  </code>
                  <CopyButton value={resourceId} />
                </div>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-px border border-border bg-border sm:min-w-[20rem]">
              <div className="flex flex-col gap-1 bg-card p-3">
                <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <MapPin className="size-3" />
                  Region
                </dt>
                <dd className="font-mono text-sm">{region}</dd>
              </div>
              <div className="flex flex-col gap-1 bg-card p-3">
                <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <Tag className="size-3" />
                  Environment
                </dt>
                <dd className="text-sm">{environment ?? "—"}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </FadeIn>
  );
}
