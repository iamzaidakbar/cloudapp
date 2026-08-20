-- CreateEnum
CREATE TYPE "MigrationPlanStatus" AS ENUM ('DRAFT', 'APPROVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "migration_plans" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "status" "MigrationPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceComparisonRunId" TEXT NOT NULL,
    "resourceCount" INTEGER NOT NULL,
    "estimatedMigrationCost" DECIMAL(12,2),
    "estimatedAwsMonthlyCost" DECIMAL(12,2),
    "estimatedGcpMonthlyCost" DECIMAL(12,2),
    "costDataAvailable" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "approvedByAdminId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "migration_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "migration_resources" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "migrationPlanId" TEXT NOT NULL,
    "comparisonItemId" TEXT NOT NULL,
    "awsService" "AwsServiceType" NOT NULL,
    "awsResourceId" TEXT NOT NULL,
    "awsResourceName" TEXT,
    "region" TEXT NOT NULL,
    "awsSizeLabel" TEXT,
    "gcpService" TEXT NOT NULL,
    "gcpSizeLabel" TEXT,
    "estimatedMigrationCost" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "migration_resources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "migration_plans_tenantId_status_idx" ON "migration_plans"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "migration_plans_tenantId_sequenceNumber_key" ON "migration_plans"("tenantId", "sequenceNumber");

-- CreateIndex
CREATE INDEX "migration_resources_tenantId_awsService_idx" ON "migration_resources"("tenantId", "awsService");

-- CreateIndex
CREATE UNIQUE INDEX "migration_resources_migrationPlanId_awsResourceId_key" ON "migration_resources"("migrationPlanId", "awsResourceId");

-- AddForeignKey
ALTER TABLE "migration_plans" ADD CONSTRAINT "migration_plans_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "migration_resources" ADD CONSTRAINT "migration_resources_migrationPlanId_fkey" FOREIGN KEY ("migrationPlanId") REFERENCES "migration_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
