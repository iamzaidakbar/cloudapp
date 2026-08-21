import type { AwsServiceType } from "@/lib/generated/prisma/client";

export const SERVICE_LABEL: Record<AwsServiceType, string> = {
  EC2_INSTANCE: "EC2",
  EBS_VOLUME: "EBS",
  SECURITY_GROUP: "Security Group",
  VPC: "VPC",
  S3_BUCKET: "S3",
  RDS_INSTANCE: "RDS",
  LAMBDA_FUNCTION: "Lambda",
  ELB_LOAD_BALANCER: "ELB",
  IAM_ROLE: "IAM",
  CLOUDWATCH_LOG_GROUP: "CloudWatch Logs",
};

export const SERVICE_LABEL_LONG: Record<AwsServiceType, string> = {
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
