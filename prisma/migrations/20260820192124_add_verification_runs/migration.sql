-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('HEALTHY', 'UNHEALTHY', 'UNAVAILABLE');

-- CreateTable
CREATE TABLE "verification_runs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "migrationPlanId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_checks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "verificationRunId" TEXT NOT NULL,
    "migrationResourceId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL,
    "detail" TEXT,
    "checkedRef" TEXT,

    CONSTRAINT "verification_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "verification_runs_tenantId_idx" ON "verification_runs"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "verification_runs_migrationPlanId_version_key" ON "verification_runs"("migrationPlanId", "version");

-- CreateIndex
CREATE INDEX "verification_checks_tenantId_verificationRunId_idx" ON "verification_checks"("tenantId", "verificationRunId");

-- AddForeignKey
ALTER TABLE "verification_runs" ADD CONSTRAINT "verification_runs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_runs" ADD CONSTRAINT "verification_runs_migrationPlanId_fkey" FOREIGN KEY ("migrationPlanId") REFERENCES "migration_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_checks" ADD CONSTRAINT "verification_checks_verificationRunId_fkey" FOREIGN KEY ("verificationRunId") REFERENCES "verification_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_checks" ADD CONSTRAINT "verification_checks_migrationResourceId_fkey" FOREIGN KEY ("migrationResourceId") REFERENCES "migration_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
