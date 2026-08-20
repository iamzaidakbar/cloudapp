-- CreateEnum
CREATE TYPE "GcpDataSource" AS ENUM ('GCP', 'DEV_ADAPTER');

-- CreateTable
CREATE TABLE "comparison_runs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "sourceAuditRunId" TEXT NOT NULL,
    "awsDataSource" "VerificationSource" NOT NULL,
    "gcpDataSource" "GcpDataSource" NOT NULL,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "itemCount" INTEGER,
    "totalAwsMonthlyCost" DECIMAL(12,2),
    "totalGcpLikeForLikeCost" DECIMAL(12,2),
    "totalGcpOptimizedCost" DECIMAL(12,2),
    "costDataAvailable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comparison_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comparison_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "comparisonRunId" TEXT NOT NULL,
    "auditResourceId" TEXT NOT NULL,
    "awsService" "AwsServiceType" NOT NULL,
    "awsResourceId" TEXT NOT NULL,
    "awsResourceName" TEXT,
    "region" TEXT NOT NULL,
    "awsSizeLabel" TEXT,
    "gcpService" TEXT NOT NULL,
    "gcpSizeLabel" TEXT,
    "currentAwsMonthlyCost" DECIMAL(12,2),
    "gcpLikeForLikeMonthlyCost" DECIMAL(12,2),
    "gcpOptimizedMonthlyCost" DECIMAL(12,2),
    "costAvailable" BOOLEAN NOT NULL DEFAULT false,
    "estimatedMigrationCost" DECIMAL(12,2),
    "performanceNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comparison_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_cache" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comparison_runs_tenantId_status_idx" ON "comparison_runs"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "comparison_runs_tenantId_version_key" ON "comparison_runs"("tenantId", "version");

-- CreateIndex
CREATE INDEX "comparison_items_tenantId_awsService_idx" ON "comparison_items"("tenantId", "awsService");

-- CreateIndex
CREATE UNIQUE INDEX "comparison_items_comparisonRunId_awsResourceId_key" ON "comparison_items"("comparisonRunId", "awsResourceId");

-- CreateIndex
CREATE INDEX "pricing_cache_expiresAt_idx" ON "pricing_cache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_cache_provider_cacheKey_key" ON "pricing_cache"("provider", "cacheKey");

-- AddForeignKey
ALTER TABLE "comparison_runs" ADD CONSTRAINT "comparison_runs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparison_items" ADD CONSTRAINT "comparison_items_comparisonRunId_fkey" FOREIGN KEY ("comparisonRunId") REFERENCES "comparison_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
