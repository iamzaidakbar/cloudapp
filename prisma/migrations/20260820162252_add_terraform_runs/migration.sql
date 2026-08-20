-- CreateEnum
CREATE TYPE "TerraformRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "terraform_runs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "migrationPlanId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "TerraformRunStatus" NOT NULL DEFAULT 'QUEUED',
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "terraformConfig" TEXT NOT NULL,
    "validateSucceeded" BOOLEAN,
    "validateOutput" TEXT,
    "planSucceeded" BOOLEAN,
    "planOutput" TEXT,
    "resourcesToCreate" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terraform_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "terraform_runs_tenantId_status_idx" ON "terraform_runs"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "terraform_runs_migrationPlanId_version_key" ON "terraform_runs"("migrationPlanId", "version");

-- AddForeignKey
ALTER TABLE "terraform_runs" ADD CONSTRAINT "terraform_runs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terraform_runs" ADD CONSTRAINT "terraform_runs_migrationPlanId_fkey" FOREIGN KEY ("migrationPlanId") REFERENCES "migration_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
