import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { ResourceStatusBadge } from "@/components/infrastructure/resource-status-badge";
import { DataSourceBadge } from "@/components/aws/data-source-badge";
import { PageHeader } from "@/components/shared/page-header";
import { FadeIn } from "@/components/motion/fade-in";
import type { AwsServiceType, VerificationSource } from "@/lib/generated/prisma/client";

const SERVICE_LABEL: Record<AwsServiceType, string> = {
  EC2_INSTANCE: "EC2 Instance",
  EBS_VOLUME: "EBS Volume",
  SECURITY_GROUP: "Security Group",
  VPC: "VPC",
  S3_BUCKET: "S3 Bucket",
  RDS_INSTANCE: "RDS Instance",
  LAMBDA_FUNCTION: "Lambda Function",
  ELB_LOAD_BALANCER: "Load Balancer",
  IAM_ROLE: "IAM Role",
  CLOUDWATCH_LOG_GROUP: "CloudWatch Log Group",
};

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
    <FadeIn delayMs={0} className="flex flex-col gap-3">
      <Link href="/infrastructure" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft className="size-3.5" />
        Infrastructure
      </Link>

      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium text-muted-foreground">{SERVICE_LABEL[service]}</p>
        <PageHeader
          title={name ?? resourceId}
          description={
            <span className="flex items-center gap-1">
              <code className="truncate font-mono text-xs text-muted-foreground">{resourceId}</code>
              <CopyButton value={resourceId} />
            </span>
          }
          actions={
            <>
              <DataSourceBadge dataSource={dataSource} />
              <ResourceStatusBadge status={status} />
            </>
          }
        />
      </div>

      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>
          Region: <span className="font-mono text-xs text-foreground">{region}</span>
        </span>
        <span>
          Environment: <span className="text-foreground">{environment ?? "—"}</span>
        </span>
      </div>
    </FadeIn>
  );
}
