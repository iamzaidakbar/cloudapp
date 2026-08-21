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
      <section className="border border-border bg-card">
        <div className="flex flex-col gap-3 px-4 py-3 md:px-5">
          <Link
            href="/infrastructure"
            className={cn(
              buttonVariants({ variant: "ghost", size: "xs" }),
              "-ml-1.5 w-fit",
            )}
          >
            <ArrowLeft className="size-3.5" />
            Infrastructure
          </Link>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {SERVICE_LABEL_LONG[service]}
                </span>
                <DataSourceBadge dataSource={dataSource} />
                <ResourceStatusBadge status={status} />
              </div>

              <div className="flex min-w-0 flex-col gap-1">
                <h1 className="truncate text-xl font-semibold tracking-tight md:text-2xl">
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

            <dl className="grid grid-cols-2 gap-px border border-border bg-border sm:min-w-[18rem]">
              <div className="flex flex-col gap-0.5 bg-card px-3 py-2">
                <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <MapPin className="size-3" />
                  Region
                </dt>
                <dd className="font-mono text-sm">{region}</dd>
              </div>
              <div className="flex flex-col gap-0.5 bg-card px-3 py-2">
                <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
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
