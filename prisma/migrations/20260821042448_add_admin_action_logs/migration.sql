-- CreateEnum
CREATE TYPE "AdminActionType" AS ENUM ('LOGIN_SUCCEEDED', 'LOGIN_FAILED', 'LOGOUT', 'TENANT_CREATED', 'AWS_CONNECTION_UPDATED', 'AWS_CONNECTION_VERIFIED', 'AUDIT_STARTED', 'COMPARISON_STARTED', 'MIGRATION_PLAN_CREATED', 'MIGRATION_APPROVED', 'MIGRATION_CANCELLED', 'TERRAFORM_GENERATED', 'MIGRATION_APPLIED', 'VERIFICATION_RUN', 'MIGRATION_ROLLED_BACK');

-- CreateTable
CREATE TABLE "admin_action_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "adminId" TEXT,
    "adminEmail" TEXT NOT NULL,
    "action" "AdminActionType" NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "detail" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_action_logs_tenantId_createdAt_idx" ON "admin_action_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "admin_action_logs_action_idx" ON "admin_action_logs"("action");
