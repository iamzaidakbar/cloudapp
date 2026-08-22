-- CreateEnum
CREATE TYPE "TransferRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- AlterEnum
ALTER TYPE "AdminActionType" ADD VALUE 'DATA_TRANSFER_STARTED';

-- AlterTable
ALTER TABLE "migration_resources" ADD COLUMN "transferredAt" TIMESTAMP(3),
ADD COLUMN "objectsTransferred" INTEGER,
ADD COLUMN "bytesTransferred" BIGINT;

-- CreateTable
CREATE TABLE "transfer_runs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "migrationPlanId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "TransferRunStatus" NOT NULL DEFAULT 'QUEUED',
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "objectsCopied" INTEGER,
    "bytesCopied" BIGINT,
    "skippedResources" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transfer_runs_tenantId_status_idx" ON "transfer_runs"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_runs_migrationPlanId_version_key" ON "transfer_runs"("migrationPlanId", "version");

-- AddForeignKey
ALTER TABLE "transfer_runs" ADD CONSTRAINT "transfer_runs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_runs" ADD CONSTRAINT "transfer_runs_migrationPlanId_fkey" FOREIGN KEY ("migrationPlanId") REFERENCES "migration_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
