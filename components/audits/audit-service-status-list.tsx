import { Check, X, Clock, MinusCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AwsServiceType, ServiceCollectionStatus } from "@/lib/generated/prisma/client";

const SERVICE_LABEL: Record<AwsServiceType, string> = {
  EC2_INSTANCE: "EC2 Instances",
  EBS_VOLUME: "EBS Volumes",
  SECURITY_GROUP: "Security Groups",
  VPC: "VPCs",
  S3_BUCKET: "S3 Buckets",
  RDS_INSTANCE: "RDS Instances",
  LAMBDA_FUNCTION: "Lambda Functions",
  ELB_LOAD_BALANCER: "Load Balancers",
  IAM_ROLE: "IAM Roles",
  CLOUDWATCH_LOG_GROUP: "CloudWatch Log Groups",
};

const STATUS_ICON: Record<ServiceCollectionStatus, React.ReactNode> = {
  PENDING: <Clock className="size-3.5 text-muted-foreground" />,
  SUCCEEDED: <Check className="size-3.5 text-foreground" />,
  FAILED: <X className="size-3.5 text-destructive" />,
  SKIPPED: <MinusCircle className="size-3.5 text-muted-foreground" />,
};

export type ServiceStatusRow = {
  service: AwsServiceType;
  status: ServiceCollectionStatus;
  resourceCount: number;
  errorMessage: string | null;
};

export function AuditServiceStatusList({ services }: { services: ServiceStatusRow[] }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">Per-Service Status</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        {services.map((service) => (
          <div key={service.service} className="flex items-start gap-2 text-sm">
            {STATUS_ICON[service.status]}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-foreground">{SERVICE_LABEL[service.service]}</span>
                <span className="text-xs text-muted-foreground">
                  {service.status === "SUCCEEDED" ? `${service.resourceCount} found` : service.status.toLowerCase()}
                </span>
              </div>
              {service.errorMessage ? (
                <p className="truncate text-xs text-destructive">{service.errorMessage}</p>
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
