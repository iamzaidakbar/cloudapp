-- CreateEnum
CREATE TYPE "ApplyRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- AlterTable
ALTER TABLE "migration_resources" ADD COLUMN     "gcpResourceSelfLink" TEXT,
ADD COLUMN     "provisionedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "apply_runs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "migrationPlanId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "ApplyRunStatus" NOT NULL DEFAULT 'QUEUED',
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "applyOutput" TEXT,
    "resourcesCreated" INTEGER,
    "terraformState" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apply_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "apply_runs_tenantId_status_idx" ON "apply_runs"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "apply_runs_migrationPlanId_version_key" ON "apply_runs"("migrationPlanId", "version");

-- AddForeignKey
ALTER TABLE "apply_runs" ADD CONSTRAINT "apply_runs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apply_runs" ADD CONSTRAINT "apply_runs_migrationPlanId_fkey" FOREIGN KEY ("migrationPlanId") REFERENCES "migration_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
