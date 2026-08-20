-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ServiceCollectionStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "FindingSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "FindingType" AS ENUM ('PUBLIC_S3_BUCKET', 'UNENCRYPTED_EBS_VOLUME', 'UNATTACHED_EBS_VOLUME', 'UNDERUTILIZED_EC2_INSTANCE', 'OVER_PROVISIONED_EC2_INSTANCE', 'MISSING_TAGS');

-- CreateEnum
CREATE TYPE "AwsServiceType" AS ENUM ('EC2_INSTANCE', 'EBS_VOLUME', 'SECURITY_GROUP', 'VPC', 'S3_BUCKET', 'RDS_INSTANCE', 'LAMBDA_FUNCTION', 'ELB_LOAD_BALANCER', 'IAM_ROLE', 'CLOUDWATCH_LOG_GROUP');

-- CreateTable
CREATE TABLE "audit_runs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "dataSource" "VerificationSource" NOT NULL,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "resourceCount" INTEGER,
    "findingCount" INTEGER,
    "criticalFindingCount" INTEGER,
    "estimatedMonthlyCost" DECIMAL(12,2),
    "costDataAvailable" BOOLEAN NOT NULL DEFAULT false,
    "utilizationDataAvailable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_service_statuses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "auditRunId" TEXT NOT NULL,
    "service" "AwsServiceType" NOT NULL,
    "status" "ServiceCollectionStatus" NOT NULL DEFAULT 'PENDING',
    "resourceCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "audit_service_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_resources" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "auditRunId" TEXT NOT NULL,
    "service" "AwsServiceType" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "name" TEXT,
    "region" TEXT NOT NULL,
    "status" TEXT,
    "environment" TEXT,
    "tags" JSONB NOT NULL DEFAULT '{}',
    "rawConfig" JSONB NOT NULL,
    "monthlyCost" DECIMAL(12,2),
    "costAvailable" BOOLEAN NOT NULL DEFAULT false,
    "cpuUtilizationAvgPercent" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_findings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "auditRunId" TEXT NOT NULL,
    "resourceId" TEXT,
    "type" "FindingType" NOT NULL,
    "severity" "FindingSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "remediation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_findings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_runs_tenantId_status_idx" ON "audit_runs"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "audit_runs_tenantId_version_key" ON "audit_runs"("tenantId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "audit_service_statuses_auditRunId_service_key" ON "audit_service_statuses"("auditRunId", "service");

-- CreateIndex
CREATE INDEX "audit_resources_tenantId_service_idx" ON "audit_resources"("tenantId", "service");

-- CreateIndex
CREATE INDEX "audit_resources_tenantId_region_idx" ON "audit_resources"("tenantId", "region");

-- CreateIndex
CREATE UNIQUE INDEX "audit_resources_auditRunId_service_resourceId_key" ON "audit_resources"("auditRunId", "service", "resourceId");

-- CreateIndex
CREATE INDEX "audit_findings_tenantId_severity_idx" ON "audit_findings"("tenantId", "severity");

-- CreateIndex
CREATE INDEX "audit_findings_auditRunId_idx" ON "audit_findings"("auditRunId");

-- AddForeignKey
ALTER TABLE "audit_runs" ADD CONSTRAINT "audit_runs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_service_statuses" ADD CONSTRAINT "audit_service_statuses_auditRunId_fkey" FOREIGN KEY ("auditRunId") REFERENCES "audit_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_resources" ADD CONSTRAINT "audit_resources_auditRunId_fkey" FOREIGN KEY ("auditRunId") REFERENCES "audit_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_auditRunId_fkey" FOREIGN KEY ("auditRunId") REFERENCES "audit_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "audit_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
