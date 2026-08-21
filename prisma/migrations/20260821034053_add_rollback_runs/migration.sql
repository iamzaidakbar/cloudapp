-- CreateEnum
CREATE TYPE "RollbackRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- AlterEnum
ALTER TYPE "MigrationPlanStatus" ADD VALUE 'ROLLED_BACK';

-- AlterTable
ALTER TABLE "migration_plans" ADD COLUMN     "rolledBackAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "rollback_runs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "migrationPlanId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "RollbackRunStatus" NOT NULL DEFAULT 'QUEUED',
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "destroyOutput" TEXT,
    "resourcesDestroyed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rollback_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rollback_runs_tenantId_status_idx" ON "rollback_runs"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "rollback_runs_migrationPlanId_version_key" ON "rollback_runs"("migrationPlanId", "version");

-- AddForeignKey
ALTER TABLE "rollback_runs" ADD CONSTRAINT "rollback_runs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rollback_runs" ADD CONSTRAINT "rollback_runs_migrationPlanId_fkey" FOREIGN KEY ("migrationPlanId") REFERENCES "migration_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
